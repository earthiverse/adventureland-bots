import { Document, Model } from "mongoose"
import { ServerRegion, MapName, ServerIdentifier, MonsterName } from "../../definitions/adventureland"

export interface IEntity {
    name: string
    map: MapName
    x: number
    y: number
    serverRegion: ServerRegion
    serverIdentifier: ServerIdentifier
    type: MonsterName
    level?: number
    hp?: number
    lastSeen?: number
}

export interface IEntityDocument extends IEntity, Document { }

export type IEntityModel = Model<IEntityDocument>
// export interface IEntityModel extends Model<IUserDocument> { }