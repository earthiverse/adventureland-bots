import { describe, expect, it } from "bun:test"
import { createMockGData } from "../../../src/test_support/g_data.mock.js"
import { buildItemCatalog } from "../../../src/domain/items/configs/index.js"
import { BankService, type BankMap } from "../../../src/domain/economy/bank_service.js"

describe("BankService", () => {
    const gData = createMockGData()
    const catalog = buildItemCatalog()

    describe("evaluateDeposits", () => {
        it("should deposit materials and non-held clutter while keeping held supplies and sellables", () => {
            const bankService = new BankService({ depositLockedItems: false })

            const merchantInventory = [
                { name: "hpot1", q: 200 }, // Replenish/hold for courier
                { name: "gslime", q: 50 }, // Material -> Should deposit
                { name: "leather", q: 20 }, // Material -> Should deposit
                { name: "sword", level: 0 }, // Upgradable or clutter -> Should deposit
                { name: "pants", level: 7, l: "locked" }, // Locked gear -> Should NOT deposit
            ]

            const decisions = bankService.evaluateDeposits(merchantInventory, catalog, gData)

            expect(decisions.length).toBe(3)
            expect(decisions.map((d) => d.item.name)).toEqual(["gslime", "leather", "sword"])
            expect(decisions.some((d) => d.item.name === "hpot1")).toBe(false)
            expect(decisions.some((d) => d.item.name === "pants")).toBe(false)
        })
    })

    describe("evaluateWithdrawals", () => {
        it("should evaluate and withdraw exchangeable stacks, upgradable items, and accessory triplets", () => {
            const bankService = new BankService()

            const bank: BankMap = {
                items0: [
                    { name: "seashell", q: 20 }, // Exchangeable stack (e: 20) -> Withdraw!
                    { name: "sword", level: 2 }, // Upgradable (maxLevel: 8) -> Withdraw!
                    { name: "sword", level: 9 }, // Exceeds max level (9 >= 8) -> Keep in bank!
                    { name: "ringsj", level: 0 }, // Accessory triplet 1
                    { name: "ringsj", level: 0 }, // Accessory triplet 2
                    { name: "ringsj", level: 0 }, // Accessory triplet 3 -> Triplet ready to compound!
                    { name: "ringsj", level: 1 }, // Lone ring -> Not a triplet
                ],
            }

            const testCatalog = {
                ...catalog,
                seashell: { exchange: true },
            }

            // Merchant has 10 free inventory spaces
            const withdrawals = bankService.evaluateWithdrawals(bank, testCatalog, gData, 10)

            expect(withdrawals.length).toBe(5)

            const exchangeWithdrawal = withdrawals.find((w) => w.reason === "exchange")
            expect(exchangeWithdrawal?.item.name).toBe("seashell")

            const upgradeWithdrawal = withdrawals.find((w) => w.reason === "upgrade")
            expect(upgradeWithdrawal?.item.name).toBe("sword")
            expect(upgradeWithdrawal?.item.level).toBe(2)

            const compoundWithdrawals = withdrawals.filter((w) => w.reason === "compound")
            expect(compoundWithdrawals.length).toBe(3)
            expect(compoundWithdrawals.every((w) => w.item.name === "ringsj" && w.item.level === 0)).toBe(true)
        })

        it("should respect merchant free inventory space limit", () => {
            const bankService = new BankService()

            const bank: BankMap = {
                items0: [
                    { name: "seashell", q: 20 },
                    { name: "sword", level: 1 },
                    { name: "coat", level: 1 },
                ],
            }

            // Merchant only has 1 free slot
            const withdrawals = bankService.evaluateWithdrawals(bank, catalog, gData, 1)
            expect(withdrawals.length).toBe(1)
        })
    })

    describe("evaluateGoldTransfer", () => {
        it("should deposit excess gold above merchantGoldToHold", () => {
            const bankService = new BankService({ merchantGoldToHold: 200_000 })
            const decision = bankService.evaluateGoldTransfer(550_000, 1_000_000)

            expect(decision.action).toBe("deposit")
            expect(decision.amount).toBe(350_000) // 550k - 200k
        })

        it("should withdraw gold when merchant gold is below minMerchantGold", () => {
            const bankService = new BankService({ merchantGoldToHold: 200_000, minMerchantGold: 100_000 })
            const decision = bankService.evaluateGoldTransfer(30_000, 500_000)

            expect(decision.action).toBe("withdraw")
            expect(decision.amount).toBe(170_000) // 200k - 30k
        })

        it("should return none when merchant gold is in healthy range", () => {
            const bankService = new BankService({ merchantGoldToHold: 200_000, minMerchantGold: 100_000 })
            const decision = bankService.evaluateGoldTransfer(150_000, 500_000)

            expect(decision.action).toBe("none")
            expect(decision.amount).toBe(0)
        })
    })

    describe("optimizeBankLayout", () => {
        it("should identify duplicate split stacks in bank packs and generate consolidation steps", () => {
            const bankService = new BankService()

            const bank: BankMap = {
                items0: [
                    { name: "seashell", q: 50 }, // Target stack
                ],
                items1: [
                    { name: "seashell", q: 30 }, // Split stack -> Consolidate into items0[0]
                ],
            }

            const steps = bankService.optimizeBankLayout(bank, gData)

            expect(steps.length).toBe(1)
            expect(steps[0]).toEqual({
                sourcePack: "items1",
                sourceIndex: 0,
                targetPack: "items0",
                targetIndex: 0,
                itemName: "seashell",
                quantityMoved: 30,
            })
        })
    })
})
