import { Command } from "./command.js"
import { Hello } from "./commands/hello.js"
import { Character } from "./commands/character.js"
import { Trade } from "./commands/trade.js"

export const Commands: Command[] = [Hello, Character, Trade]