import { Character } from "alclient"
import { Strategy, LoopName, Loop } from "../context.js"

export class OptimizeItemsStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("item", {
            fn: async (bot: Type) => {
                await this.stackItems(bot)
            },
            interval: 1_000
        })
    }

    private async stackItems(bot: Type) {
        // TODO: Look for items that we can stack
    }

    private async moveOverflowItems(bot: Type) {
        // TODO: Look for items that are in the overflow area of the items (after 42) and swap them to other spaces
    }
}