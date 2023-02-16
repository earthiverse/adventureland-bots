import { Command } from "./command.js"
import { Character } from "./commands/character.js"
import { Trade } from "./commands/trade.js"

export const Commands: Command[] = [Character, Trade]