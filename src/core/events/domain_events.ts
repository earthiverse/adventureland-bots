import type { ItemName, MapName, MonsterName, ServerIdentifier, ServerRegion } from "alclient"

export type DomainEvent =
    | {
          type: "boss:spawned"
          monster: MonsterName
          server: { region: ServerRegion; name: ServerIdentifier }
          map: MapName
          x?: number
          y?: number
          hp?: number
          maxHp?: number
      }
    | {
          type: "boss:defeated"
          monster: MonsterName
          server: { region: ServerRegion; name: ServerIdentifier }
      }
    | {
          type: "supply:needed"
          botName: string
          item: ItemName
          quantityNeeded: number
      }
    | {
          type: "server:hop_requested"
          targetRegion: ServerRegion
          targetIdentifier: ServerIdentifier
          reason: string
      }
    | {
          type: "party:member_joined"
          botName: string
          leaderName: string
      }
    | {
          type: "party:member_left"
          botName: string
      }
    | {
          type: "bot:health_critical"
          botName: string
          hp: number
          maxHp: number
          map: MapName
      }
    | {
          type: "bot:inventory_full"
          botName: string
          freeSlots: number
      }
