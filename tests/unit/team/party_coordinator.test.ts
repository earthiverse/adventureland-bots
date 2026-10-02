import { describe, expect, it } from "bun:test"
import { EventBus } from "../../../src/core/events/event_bus.js"
import { TeamBlackboard, type BotStatus } from "../../../src/core/blackboard/team_blackboard.js"
import { MockCharacter } from "../../../src/test_support/mock_character.js"
import {
    calculateFollowPosition,
    calculateUnstackOffset,
    evaluateMapTransitions,
    evaluatePartyActions,
    evaluateServerHop,
    isStacked,
    shouldAcceptPartyInvite,
    shouldAcceptPartyRequest,
    PartyCoordinator,
    FollowLeaderAction,
} from "../../../src/domain/team/party_coordinator.js"

describe("PartyCoordinator & Leader-Following Formation", () => {
    describe("Pure Formation Math & Stacking", () => {
        const leaderPos = { x: 100, y: 200, map: "main" as const }

        it("should compute role-based follow positions with safe offsets behind the tank", () => {
            const priestPos = calculateFollowPosition(leaderPos, 0, 4, "priest", { style: "role_based" })
            const magePos = calculateFollowPosition(leaderPos, 1, 4, "mage", { style: "role_based" })
            const rangerPos = calculateFollowPosition(leaderPos, 2, 4, "ranger", { style: "role_based" })
            const merchantPos = calculateFollowPosition(leaderPos, 3, 4, "merchant", { style: "role_based" })

            // Priest: behind-left (-35, 30)
            expect(priestPos.x).toBe(65)
            expect(priestPos.y).toBe(230)
            expect(priestPos.map).toBe("main")

            // Mage: behind-center (0, 45)
            expect(magePos.x).toBe(100)
            expect(magePos.y).toBe(245)

            // Ranger: behind-right (35, 30)
            expect(rangerPos.x).toBe(135)
            expect(rangerPos.y).toBe(230)

            // Merchant: safe deep-rear (0, 75)
            expect(merchantPos.x).toBe(100)
            expect(merchantPos.y).toBe(275)

            // Ensure none of the followers share identical positions
            expect(priestPos).not.toEqual(magePos)
            expect(magePos).not.toEqual(rangerPos)
            expect(rangerPos).not.toEqual(merchantPos)
        })

        it("should fan out followers in a wedge formation without stacking", () => {
            const pos0 = calculateFollowPosition(leaderPos, 0, 3, undefined, { style: "wedge", baseDistance: 50 })
            const pos1 = calculateFollowPosition(leaderPos, 1, 3, undefined, { style: "wedge", baseDistance: 50 })
            const pos2 = calculateFollowPosition(leaderPos, 2, 3, undefined, { style: "wedge", baseDistance: 50 })

            // None should be stacked on the leader (distance ~ 50)
            expect(Math.hypot(pos0.x - leaderPos.x, pos0.y - leaderPos.y)).toBeCloseTo(50, 0)
            expect(Math.hypot(pos1.x - leaderPos.x, pos1.y - leaderPos.y)).toBeCloseTo(50, 0)
            expect(Math.hypot(pos2.x - leaderPos.x, pos2.y - leaderPos.y)).toBeCloseTo(50, 0)

            // None should be stacked on each other
            expect(isStacked(pos0, pos1, 15)).toBe(false)
            expect(isStacked(pos1, pos2, 15)).toBe(false)
        })

        it("should detect stacked coordinates and provide unstacking offsets", () => {
            const botA = { x: 50, y: 50 }
            const botB = { x: 53, y: 52 }
            const botC = { x: 80, y: 80 }

            expect(isStacked(botA, botB, 8)).toBe(true)
            expect(isStacked(botA, botC, 8)).toBe(false)

            const offset0 = calculateUnstackOffset(0, 20)
            const offset1 = calculateUnstackOffset(1, 20)

            expect(offset0).not.toEqual(offset1)
            expect(Math.hypot(offset0.x, offset0.y)).toBeCloseTo(20, 0)
        })
    })

    describe("Map Transition & Realm Hop Evaluation", () => {
        const leaderStatus: BotStatus = {
            name: "tankWar",
            type: "warrior",
            map: "halloween",
            x: 0,
            y: 0,
            hp: 4000,
            maxHp: 4000,
            mp: 800,
            maxMp: 800,
            freeInventorySlots: 20,
            gold: 50000,
            isReady: true,
            isDead: false,
            lastUpdated: Date.now(),
        }

        it("should trigger urgent transition for followers trapped on a different map", () => {
            const followerMain: BotStatus = {
                ...leaderStatus,
                name: "squishyPri",
                type: "priest",
                map: "main", // Different map!
                x: 0,
                y: 0,
            }

            const plans = evaluateMapTransitions(leaderStatus, [followerMain])
            expect(plans).toHaveLength(1)
            expect(plans[0].action).toBe("transition")
            expect(plans[0].followerName).toBe("squishyPri")
            expect(plans[0].sourceMap).toBe("main")
            expect(plans[0].targetMap).toBe("halloween")
            expect(plans[0].distance).toBe(Infinity)
        })

        it("should mark followers in_sync when within leash distance on the same map", () => {
            // Priest follow position for (0,0) is (-35, 30)
            const followerNearby: BotStatus = {
                ...leaderStatus,
                name: "squishyPri",
                type: "priest",
                map: "halloween",
                x: -33,
                y: 32, // Distance ~ 2.8px from (-35, 30), well within leash 30
            }

            const plans = evaluateMapTransitions(leaderStatus, [followerNearby], { leashDistance: 30 })
            expect(plans).toHaveLength(1)
            expect(plans[0].action).toBe("in_sync")
            expect(plans[0].distance).toBeLessThan(30)
        })

        it("should trigger move action when follower lags behind beyond leash distance", () => {
            const followerLagging: BotStatus = {
                ...leaderStatus,
                name: "squishyMage",
                type: "mage",
                map: "halloween",
                x: -150,
                y: -100, // Far away
            }

            const plans = evaluateMapTransitions(leaderStatus, [followerLagging], { leashDistance: 30 })
            expect(plans).toHaveLength(1)
            expect(plans[0].action).toBe("move")
            expect(plans[0].distance).toBeGreaterThan(100)
            expect(plans[0].targetMap).toBe("halloween")
        })

        it("should evaluate server hop readiness across the team", () => {
            const currentServer = { region: "US" as const, name: "I" as const }
            const targetServer = { region: "EU" as const, name: "II" as const }

            const readyBot = { ...leaderStatus, name: "bot1", isReady: true, isDead: false }
            const deadBot = { ...leaderStatus, name: "bot2", isReady: true, isDead: true }

            const plan = evaluateServerHop(currentServer, targetServer, [readyBot, deadBot])
            expect(plan.shouldHop).toBe(true)
            expect(plan.readyMembers).toEqual(["bot1"])
            expect(plan.pendingMembers).toEqual(["bot2"])
        })
    })

    describe("Party Invitations & Membership Coordination", () => {
        const leaderName = "earthWar"
        const teamMembers = ["earthWar", "earthPri", "earthMag", "earthMer"]

        it("should accept party invites strictly from the designated leader", () => {
            expect(shouldAcceptPartyInvite("earthWar", leaderName)).toBe(true)
            expect(shouldAcceptPartyInvite("stranger", leaderName)).toBe(false)
            expect(shouldAcceptPartyInvite("earthMag", leaderName)).toBe(false)
        })

        it("should accept party requests strictly from whitelisted team members", () => {
            expect(shouldAcceptPartyRequest("earthPri", teamMembers)).toBe(true)
            expect(shouldAcceptPartyRequest("earthMag", teamMembers)).toBe(true)
            expect(shouldAcceptPartyRequest("randomPlayer", teamMembers)).toBe(false)
        })

        it("should evaluate missing party members and generate invite/request actions", () => {
            const partyStates = new Map<string, { partyLeader?: string; partyList?: string[] }>([
                ["earthWar", { partyLeader: "earthWar", partyList: ["earthWar", "earthPri"] }],
                ["earthPri", { partyLeader: "earthWar", partyList: ["earthWar", "earthPri"] }],
                ["earthMag", { partyLeader: undefined, partyList: undefined }],
                ["earthMer", { partyLeader: undefined, partyList: undefined }],
            ])

            const actions = evaluatePartyActions(leaderName, teamMembers, partyStates)

            // earthMag and earthMer should receive invites and requests
            expect(actions).toContainEqual({
                type: "send_invite",
                leaderName: "earthWar",
                targetName: "earthMag",
            })
            expect(actions).toContainEqual({
                type: "send_request",
                botName: "earthMag",
                leaderName: "earthWar",
            })
            expect(actions).toContainEqual({
                type: "send_invite",
                leaderName: "earthWar",
                targetName: "earthMer",
            })
        })

        it("should automate party sync through PartyCoordinator with live character sockets", async () => {
            const eventBus = new EventBus()
            const blackboard = new TeamBlackboard("US", "I", eventBus)

            const coordinator = new PartyCoordinator({
                leaderName: "earthWar",
                teamMembers: ["earthWar", "earthPri"],
                eventBus,
                blackboard,
            })

            const leaderBot = new MockCharacter({ name: "earthWar", ctype: "warrior" })
            const priBot = new MockCharacter({ name: "earthPri", ctype: "priest" })

            const cleanupPri = coordinator.attachBot(priBot.asPingCompensated())
            const cleanupLeader = coordinator.attachBot(leaderBot.asPingCompensated())

            let joinEventFired = false
            eventBus.subscribe("party:member_joined", (e) => {
                if (e.botName === "earthPri" && e.leaderName === "earthWar") {
                    joinEventFired = true
                }
            })

            // priBot receives invite from leader
            priBot.socket.emit("invite", { name: "earthWar" })
            await new Promise((resolve) => setTimeout(resolve, 10))
            expect(priBot.party).toBe("earthWar")
            expect(joinEventFired).toBe(true)

            cleanupPri()
            cleanupLeader()
        })
    })

    describe("FollowLeaderAction", () => {
        it("should not execute for the party leader", () => {
            const eventBus = new EventBus()
            const blackboard = new TeamBlackboard("US", "I", eventBus)
            const coordinator = new PartyCoordinator({
                leaderName: "earthWar",
                teamMembers: ["earthWar", "earthPri"],
                eventBus,
                blackboard,
            })

            const action = new FollowLeaderAction(coordinator)
            const leaderBot = new MockCharacter({ name: "earthWar", ctype: "warrior" })

            expect(action.canExecute(leaderBot.asPingCompensated(), {} as any)).toBe(false)
            expect(action.score(leaderBot.asPingCompensated(), {} as any)).toBe(0)
        })

        it("should assign emergency score 88 when follower is on a different map", () => {
            const eventBus = new EventBus()
            const blackboard = new TeamBlackboard("US", "I", eventBus)
            const coordinator = new PartyCoordinator({
                leaderName: "earthWar",
                teamMembers: ["earthWar", "earthPri"],
                eventBus,
                blackboard,
            })

            blackboard.updateMemberStatus({
                name: "earthWar",
                type: "warrior",
                map: "halloween",
                x: 0,
                y: 0,
                hp: 4000,
                maxHp: 4000,
                mp: 500,
                maxMp: 500,
                freeInventorySlots: 20,
                gold: 50000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })

            blackboard.updateMemberStatus({
                name: "earthPri",
                type: "priest",
                map: "main", // Different map!
                x: 0,
                y: 0,
                hp: 2000,
                maxHp: 2000,
                mp: 1000,
                maxMp: 1000,
                freeInventorySlots: 20,
                gold: 50000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })

            const action = new FollowLeaderAction(coordinator)
            const priBot = new MockCharacter({ name: "earthPri", ctype: "priest", map: "main" })

            expect(action.canExecute(priBot.asPingCompensated(), {} as any)).toBe(true)
            expect(action.score(priBot.asPingCompensated(), {} as any)).toBe(88)
        })

        it("should score 75 when follower is far behind and 45 when moderately lagging", () => {
            const eventBus = new EventBus()
            const blackboard = new TeamBlackboard("US", "I", eventBus)
            const coordinator = new PartyCoordinator({
                leaderName: "earthWar",
                teamMembers: ["earthWar", "earthPri"],
                eventBus,
                blackboard,
            })

            // Leader at (0, 0)
            blackboard.updateMemberStatus({
                name: "earthWar",
                type: "warrior",
                map: "main",
                x: 0,
                y: 0,
                hp: 4000,
                maxHp: 4000,
                mp: 500,
                maxMp: 500,
                freeInventorySlots: 20,
                gold: 50000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })

            const action = new FollowLeaderAction(coordinator)

            // Case A: Far behind (dist > 250)
            blackboard.updateMemberStatus({
                name: "earthPri",
                type: "priest",
                map: "main",
                x: -300,
                y: -300,
                hp: 2000,
                maxHp: 2000,
                mp: 1000,
                maxMp: 1000,
                freeInventorySlots: 20,
                gold: 50000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })
            const priFar = new MockCharacter({ name: "earthPri", ctype: "priest", map: "main", x: -300, y: -300 })
            expect(action.score(priFar.asPingCompensated(), {} as any)).toBe(75)

            // Case B: Moderately lagging (dist > 30, but < 250)
            // Follow target for priest is (-35, 30). Placing at (-100, 30) -> dist = 65
            blackboard.updateMemberStatus({
                name: "earthPri",
                type: "priest",
                map: "main",
                x: -100,
                y: 30,
                hp: 2000,
                maxHp: 2000,
                mp: 1000,
                maxMp: 1000,
                freeInventorySlots: 20,
                gold: 50000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })
            const priModerate = new MockCharacter({ name: "earthPri", ctype: "priest", map: "main", x: -100, y: 30 })
            expect(action.score(priModerate.asPingCompensated(), {} as any)).toBe(45)

            // Case C: In position (dist <= 30)
            blackboard.updateMemberStatus({
                name: "earthPri",
                type: "priest",
                map: "main",
                x: -35,
                y: 30,
                hp: 2000,
                maxHp: 2000,
                mp: 1000,
                maxMp: 1000,
                freeInventorySlots: 20,
                gold: 50000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })
            const priInPosition = new MockCharacter({ name: "earthPri", ctype: "priest", map: "main", x: -35, y: 30 })
            expect(action.canExecute(priInPosition.asPingCompensated(), {} as any)).toBe(false)
            expect(action.score(priInPosition.asPingCompensated(), {} as any)).toBe(0)
        })

        it("should execute smartMove for cross-map follow and normal move for local repositioning", async () => {
            const eventBus = new EventBus()
            const blackboard = new TeamBlackboard("US", "I", eventBus)
            const coordinator = new PartyCoordinator({
                leaderName: "earthWar",
                teamMembers: ["earthWar", "earthPri"],
                eventBus,
                blackboard,
            })

            blackboard.updateMemberStatus({
                name: "earthWar",
                type: "warrior",
                map: "tunnel",
                x: 100,
                y: 100,
                hp: 4000,
                maxHp: 4000,
                mp: 500,
                maxMp: 500,
                freeInventorySlots: 20,
                gold: 50000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })

            // Follower on main map
            blackboard.updateMemberStatus({
                name: "earthPri",
                type: "priest",
                map: "main",
                x: 0,
                y: 0,
                hp: 2000,
                maxHp: 2000,
                mp: 1000,
                maxMp: 1000,
                freeInventorySlots: 20,
                gold: 50000,
                isReady: true,
                isDead: false,
                lastUpdated: Date.now(),
            })

            const action = new FollowLeaderAction(coordinator)
            const priBot = new MockCharacter({ name: "earthPri", ctype: "priest", map: "main" })

            await action.execute(priBot.asPingCompensated(), {} as any)
            const smartMoveCalls = priBot.calls.filter((c) => c.method === "smartMove")
            expect(smartMoveCalls).toHaveLength(1)
            expect(smartMoveCalls[0].args[0]).toEqual({ x: 100, y: 100, map: "tunnel" })
        })
    })
})
