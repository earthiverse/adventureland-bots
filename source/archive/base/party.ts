import { ANNOUNCEMENT_CHARACTERS, LOLWUTPEAR_CHARACTERS, MY_CHARACTERS } from "./general.js"

export const partyLeader = "earthiverse"
/** NOTE: This is in order from high -> low priority. If the party becomes full, lower priority members could be kicked to make room for higher priority members. */
export const partyMembers = [
    ...MY_CHARACTERS, ...LOLWUTPEAR_CHARACTERS, ...ANNOUNCEMENT_CHARACTERS
]

export const stompPartyLeader = "earthWar"
/** NOTE: This is in order from high -> low priority. If the party becomes full, lower priority members could be kicked to make room for higher priority members. */
export const stompPartyMembers = [
    // earthiverse's warriors
    "earthWar", "earthWar2", "earthWar3",
    // lolwutpear's warriors
    "fgsfds", "fsjal", "funny",
    // announcement's warriors
    "announcement", "battleworthy", "charmingness",
]