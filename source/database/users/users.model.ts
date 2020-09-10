import pkg from "mongoose"
const { model } = pkg

import { IUserDocument } from "./users.types.js"
import UserSchema from "./users.schema.js"

export const UserModel = model<IUserDocument>("user", UserSchema)
UserModel.createIndexes()