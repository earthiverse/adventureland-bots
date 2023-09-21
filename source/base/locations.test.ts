import AL, { Character, IPosition } from "alclient"
import { offsetPositionParty } from "./locations"

beforeAll(async () => {
    await AL.Game.getGData(true, false)
    await AL.Pathfinder.prepare(AL.Game.G, { maps: ["main"] })
}, 60_000)

test("offsetPositionParty doesn't generate the same position for different offsets", async () => {
    const position: IPosition = { map: "main", x: -140, y: -185 }
    const list = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
    const character = {
        id: "1",
        party: "1",
        partyData: {
            list: list
        }
    } as Character
    const generatedPositions: IPosition[] = []
    for (const element of list) {
        character.id = element
        const generatedPosition = offsetPositionParty(position, character, 10)
        expect(generatedPositions).not.toContainEqual(generatedPosition)
        generatedPositions.push(generatedPosition)
    }
}, 5_000)