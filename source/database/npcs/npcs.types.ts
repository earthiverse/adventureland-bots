import { Document, Model } from "mongoose"
import { ServerRegion, MapName, ServerIdentifier, MonsterName } from "../../definitions/adventureland"

export interface INPC {
    name: string
    map: MapName
    x: number
    y: number
    serverRegion: ServerRegion
    serverIdentifier: ServerIdentifier
    type: MonsterName
    lastSeen?: number
}

export interface INPCDocument extends INPC, Document { }

export type IEntityModel = Model<INPCDocument>
// export interface IEntityModel extends Model<IUserDocument> { }