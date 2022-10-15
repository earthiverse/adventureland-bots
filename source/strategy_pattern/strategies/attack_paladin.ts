import { Paladin } from "alclient"
import { BaseAttackStrategy, BaseAttackStrategyOptions } from "./attack.js"

export type PaladinAttackStrategyOptions = BaseAttackStrategyOptions & {
    // TODO: Implement paladin options
}

export class PaladinAttackStrategy extends BaseAttackStrategy<Paladin> {
    public options: PaladinAttackStrategyOptions

    public constructor(options?: PaladinAttackStrategyOptions) {
        super(options)
    }

    // TODO: Implement paladin special strategies
}