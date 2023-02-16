import { Command } from "./command.js"
import { Hello } from "./commands/hello.js"
import { Character } from "./commands/character.js"

export const Commands: Command[] = [Hello, Character]