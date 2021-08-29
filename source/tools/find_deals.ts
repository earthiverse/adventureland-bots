import AL from "alclient"
import fs from "fs"

type BuyData = {
    itemName: AL.ItemName
    itemLevel: number
    name: string
    map: AL.MapName
    x: number
    y: number
    price: number
}

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    const G = await AL.Game.getGData(true)

    // Grab and parse the data
    console.log("Grabbing merchant data...")
    const num = {
        buyingItems: 0,
        merchants: 0,
        sellingItems: 0
    }
    const buying: { [T in string]: BuyData[] } = {}
    const selling: { [T in string]: BuyData[] } = {}
    const merchantData = await AL.Game.getMerchants()
    fs.writeFileSync("merchantData.json", JSON.stringify(merchantData))
    for (const merchant of merchantData) {
        num.merchants += 1
        for (const slotName in merchant.slots) {
            const item = merchant.slots[slotName as AL.TradeSlotType]
            const key = item.level == undefined ? item.name : `${item.name}_${item.level}`

            if (item.b) {
                // They are buying
                if (!buying[key]) buying[key] = []
                buying[key].push({
                    itemLevel: item.level,
                    itemName: item.name,
                    map: merchant.map,
                    name: merchant.name,
                    price: item.price,
                    x: merchant.x,
                    y: merchant.y
                })
                num.buyingItems += 1
            } else {
                // They are selling
                if (!selling[key]) selling[key] = []
                selling[key].push({
                    itemLevel: item.level,
                    itemName: item.name,
                    map: merchant.map,
                    name: merchant.name,
                    price: item.price,
                    x: merchant.x,
                    y: merchant.y
                })
                num.sellingItems += 1
            }
        }
    }

    console.log(`${num.merchants} merchants are buying ${num.buyingItems} items, and selling ${num.sellingItems} items.`)

    // Look for items that could be dropshipped
    for (const buyOrder in buying) {
        if (selling[buyOrder]) {
            let bestBuyer = { price: Number.MIN_VALUE }
            for (const order of buying[buyOrder]) {
                if (order.price > bestBuyer.price) bestBuyer = order
            }
            const bestBuy = bestBuyer as BuyData

            let bestSeller = { price: Number.MAX_VALUE }
            for (const order of selling[buyOrder]) {
                if (order.price > bestSeller.price) bestSeller = order
            }
            const bestSell = bestSeller as BuyData

            if (bestBuyer.price > bestSeller.price) {
                console.log(`We can make money on ${buyOrder} if...`)
                console.log(`  We buy from ${bestBuy.name} at ${bestBuy.price}`)
                console.log(`  We sell to ${bestSell.name} for ${bestSell.price}`)
            }
        }
    }

    // Look for items that cost less than G's value
    for (const sellOrder in selling) {
        let bestSeller = { price: Number.MAX_VALUE }
        for (const order of selling[sellOrder]) {
            if (order.price < bestSeller.price) bestSeller = order
        }
        const bestSell = bestSeller as BuyData

        if (!G.items[bestSell.itemName]) {
            console.error(`What is a ${bestSell.itemName}?`)
            return
        }

        if (bestSeller.price < G.items[bestSell.itemName].g * 0.6) {
            console.log(`We could resell ${bestSell.name}'s ${bestSell.itemName} to the NPC for profit.`)
        } else if (bestSeller.price < G.items[bestSell.itemName].g) {
            console.log(`${bestSell.name}'s ${bestSell.itemName} @ ${bestSell.price} is a good price.`)
        }
    }

    await AL.Database.disconnect()
})