import { ANNOUNCEMENT_CHARACTERS, KOUIN_CHARACTERS, LOLWUTPEAR_CHARACTERS, MY_CHARACTERS } from "../base/general.js"

export const partyLeader = "earthiverse"
/** NOTE: This is in order from high -> low priority. If the party becomes full, lower priority members could be kicked to make room for higher priority members. */
export const partyMembers = [
    // Earthiverse's characters
    ...MY_CHARACTERS,
    // Kouin's characters
    ...KOUIN_CHARACTERS,
    // Lolwutpear's characters
    ...LOLWUTPEAR_CHARACTERS,
    // Announcement's characters
    ...ANNOUNCEMENT_CHARACTERS
]