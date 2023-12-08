import { BankInfo, BankPackName, Character, CharacterData, ItemName, Rogue } from "alclient"
import { sleep } from "../../base/general.js"
import { DEFAULT_ITEMS_TO_HOLD } from "../../base/defaults.js"
import { Strategy, LoopName, Loop } from "../context.js"
import { suppress_errors } from "../logging.js"

// TODO: Improve to bank not on a specific map, but all available maps

export type MoveToBankAndDepositStuffStrategyOptions = {
    invisibleRogue?: true
    itemsToHold?: Set<ItemName>
    map?: "bank_b" | "bank_u" | "bank"
}

export class MoveToBankAndDepositStuffStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected options: MoveToBankAndDepositStuffStrategyOptions

    public constructor(options?: MoveToBankAndDepositStuffStrategyOptions) {
        // Set default options
        if (!options) options = {}
        if (!options.itemsToHold) options.itemsToHold = DEFAULT_ITEMS_TO_HOLD
        if (!options.map) options.map = "bank"
        this.options = options

        this.loops.set("move", {
            fn: async (bot: Type) => {
                await this.moveAndBank(bot)
            },
            interval: 100,
        })

        // Scare if we need
        this.loops.set("attack", {
            fn: async (bot: Type) => {
                await this.scare(bot)
            },
            interval: 50,
        })
    }

    private async moveAndBank(bot: Type) {
        if (this.options.invisibleRogue && bot.ctype == "rogue") {
            await (bot as unknown as Rogue).invis()
        }

        await bot.smartMove(this.options.map).catch(suppress_errors)

        await sleep(2000)

        for (let i = 0; i < bot.isize; i++) {
            const item = bot.items[i]
            if (!item) continue // No item
            if (item.l) continue // Item is locked
            if (this.options.itemsToHold.has(item.name)) continue // We want to hold this item

            // Deposit the items
            await bot.depositItem(i).catch(console.error)
        }
    }

    protected async scare(bot: Type) {
        if (bot.targets == 0) return // No targets
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        await bot.scare().catch(console.error)
    }
}

export class BankInformationStrategy<Type extends Character> implements Strategy<Type> {
    public checkBankInfo: (data: CharacterData) => void

    /** The string is the owner ID, since banks are shared across owners */
    public static bankData = new Map<string, BankInfo>()

    public async onApply(bot: Type) {
        this.checkBankInfo = (data: CharacterData) => {
            if (!data.user) return // No bank info (we are probably not in the bank)

            // Save the latest bank information for the owner
            BankInformationStrategy.bankData.set(data.owner, data.user)
        }
        bot.socket.on("player", this.checkBankInfo)
    }

    public async onRemove(bot: Type) {
        if (this.checkBankInfo) bot.socket.removeListener("player", this.checkBankInfo)
    }

    /**
     * Returns whether or not we have the given item in our bank
     *
     * @param owner
     * @param itemName
     * @returns
     */
    public static hasItemInBank(owner: string, itemName: ItemName) {
        const data = this.bankData.get(owner)
        if (!data) return undefined // No bank information yet

        for (const packName in data) {
            if (packName === "gold") continue
            for (const bankItem of data[packName as BankPackName]) {
                if (!bankItem) continue // No item in this slot
                if (bankItem.name === itemName) return true
            }
        }
        return false
    }

    /**
     * Returns the number of the given item in our bank
     *
     * @param owner
     * @param itemName
     * @returns
     */
    public static getNumItemsInBank(owner: string, itemName: ItemName) {
        const data = this.bankData.get(owner)
        if (!data) return undefined // No bank information yet

        let count = 0
        for (const packName in data) {
            if (packName === "gold") continue
            for (const bankItem of data[packName as BankPackName]) {
                if (!bankItem) continue // No item in this slot
                if (bankItem.name !== itemName) continue
                count += bankItem.q ?? 1
            }
        }
        return count
    }
}
