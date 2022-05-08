/* eslint-disable sort-keys */
import AL from "alclient"

/**
 * This function will aggregate the bank, the inventories of all characters,
 * and the items equipped on all characters so we can see how many of each item
 * we own in total.
 * @param owner The owner to get items for (e.g.: `bot.owner`)
 */
export async function getItemCountsForEverything(owner: string) {
    return await AL.BankModel.aggregate([
        {
            /** Find our bank **/
            $match: {
                owner: owner
            }
        },
        {
            /** Find our characters **/
            $lookup: {
                from: "players",
                localField: "owner",
                foreignField: "owner",
                as: "players"
            }
        },
        {
            /** Add player equipment **/
            $addFields: {
                equipment: {
                    $filter: {
                        input: {
                            $concatArrays: [
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 0] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 1] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 2] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 3] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 4] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 5] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 6] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 7] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 8] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 9] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 10] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 11] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 12] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 13] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 14] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 15] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 16] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 17] }, {}] } }
                            ]
                        },
                        cond: { $ne: ["$$this.v", null] }
                    }
                }
            }
        },
        {
            /** Merge equipment with bank and inventories **/
            $project: {
                allItems: {
                    $filter: {
                        input: {
                            $concatArrays: [
                                { $ifNull: ["$items0", []] },
                                { $ifNull: ["$items1", []] },
                                { $ifNull: ["$items2", []] },
                                { $ifNull: ["$items3", []] },
                                { $ifNull: ["$items4", []] },
                                { $ifNull: ["$items5", []] },
                                { $ifNull: ["$items6", []] },
                                { $ifNull: ["$items7", []] },
                                { $ifNull: ["$items8", []] },
                                { $ifNull: ["$items9", []] },
                                { $ifNull: ["$items10", []] },
                                { $ifNull: ["$items11", []] },
                                { $ifNull: ["$items12", []] },
                                { $ifNull: ["$items13", []] },
                                { $ifNull: ["$items14", []] },
                                { $ifNull: ["$items15", []] },
                                { $ifNull: ["$items16", []] },
                                { $ifNull: ["$items17", []] },
                                { $ifNull: ["$items18", []] },
                                { $ifNull: ["$items19", []] },
                                { $ifNull: ["$items20", []] },
                                { $ifNull: ["$items21", []] },
                                { $ifNull: ["$items22", []] },
                                { $ifNull: ["$items23", []] },
                                { $ifNull: ["$items24", []] },
                                { $ifNull: ["$items25", []] },
                                { $ifNull: ["$items26", []] },
                                { $ifNull: ["$items27", []] },
                                { $ifNull: ["$items28", []] },
                                { $ifNull: ["$items29", []] },
                                { $ifNull: ["$items30", []] },
                                { $ifNull: ["$items31", []] },
                                { $ifNull: ["$items32", []] },
                                { $ifNull: ["$items33", []] },
                                { $ifNull: ["$items34", []] },
                                { $ifNull: ["$items35", []] },
                                { $ifNull: ["$items36", []] },
                                { $ifNull: ["$items37", []] },
                                { $ifNull: ["$items38", []] },
                                { $ifNull: ["$items39", []] },
                                { $ifNull: ["$items40", []] },
                                { $ifNull: ["$items41", []] },
                                { $ifNull: ["$items42", []] },
                                { $ifNull: ["$items43", []] },
                                { $ifNull: ["$items44", []] },
                                { $ifNull: ["$items45", []] },
                                { $ifNull: ["$items46", []] },
                                { $ifNull: ["$items47", []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 0] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 1] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 2] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 3] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 4] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 5] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 6] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 7] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 8] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 9] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 10] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 11] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 12] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 13] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 14] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 15] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 16] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 17] }, []] },
                                { $ifNull: ["$equipment.v", []] }
                            ]
                        },
                        as: "item",
                        cond: { $ne: ["$$item", null] }
                    }
                }
            }
        },
        {
            $unwind: {
                path: "$allItems"
            }
        },
        {
            /** Group by name and level **/
            $group: {
                _id: { name: "$allItems.name", level: "$allItems.level" },
                inventorySpaces: { $count: {} },
                q: { $sum: "$allItems.q" }
            }
        },
        {
            /** Clean up **/
            $project: {
                _id: false,
                name: "$_id.name",
                level: "$_id.level",
                inventorySpaces: "$inventorySpaces",
                q: { $max: ["$q", "$inventorySpaces"] }
            }
        },
        {
            $sort: {
                name: 1,
                q: -1,
                level: -1,
            }
        }
    ])
}