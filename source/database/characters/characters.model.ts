import pkg from "mongoose"
const { model } = pkg

import { ICharacterDocument } from "./characters.types.js"
import CharacterSchema from "./characters.schema.js"

export const CharacterModel = model<ICharacterDocument>("character", CharacterSchema)
CharacterModel.createIndexes()