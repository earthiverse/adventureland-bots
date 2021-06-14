import { MY_CHARACTERS } from "../base/general.js"

export const partyLeader = "earthiverse"
/** NOTE: This is in order from high -> low priority. If the party becomes full, lower priority members could be kicked to make room for higher priority members. */
export const partyMembers = [
    // Earthiverse's characters
    ...MY_CHARACTERS,
    // Kouin's characters
    "bataxedude", "cclair", "fathergreen", "kakaka", "kekeke", "kouin", "kukuku", "mule0", "mule1", "mule2", "mule3", "mule5", "mule6", "mule7", "mule8", "mule9", "mule10", "piredude",
    // Lolwutpear's characters
    "fgsfds", "fsjal", "funny", "lolwutpear", "shoopdawhoop", "ytmnd", /* rogue!? */
    // Announcement's characters
    "announcement", "battleworthy", "charmingness", "decisiveness", "facilitating", "gratuitously", "hypothesized" /* rogue? */
]