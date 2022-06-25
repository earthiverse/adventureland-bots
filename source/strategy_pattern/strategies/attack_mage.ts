import { Mage } from "alclient"
import { BaseAttackStrategy, BaseAttackStrategyOptions } from "./attack.js"

export type MageAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableCburst?: boolean
}

export class MageAttackStrategy extends BaseAttackStrategy<Mage> {
    public constructor(options?: MageAttackStrategyOptions) {
        super(options)
    }

    public async attack(bot: Mage): Promise<void> {
        // Basic attack
        return super.attack(bot)
    }
}