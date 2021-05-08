import AL from "alclient-mongo"
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
    const G = await AL.Game.getGData()

    // Grab and parse the data
    console.log("Grabbing merchant data...")
    const buying: { [T in string]: BuyData[] } = {}
    const selling: { [T in string]: BuyData[] } = {}
    const merchantData = await AL.Game.getMerchants()
    fs.writeFileSync("merchantData.json", JSON.stringify(merchantData))
    for (const merchant of merchantData) {
        for (const slotName in merchant.slots) {
            const item = merchant.slots[slotName as AL.TradeSlotType]
            const key = item.level == undefined ? item.name : `${item.name}_${item.level}`

            if (item.b) {
                // They are buying
                if (!buying[key]) buying[key] = []
                buying[key].push({
                    itemName: item.name,
                    itemLevel: item.level,
                    name: merchant.name,
                    map: merchant.map,
                    x: merchant.x,
                    y: merchant.y,
                    price: item.price
                })
            } else {
                // They are selling
                if (!selling[key]) selling[key] = []
                selling[key].push({
                    itemName: item.name,
                    itemLevel: item.level,
                    name: merchant.name,
                    map: merchant.map,
                    x: merchant.x,
                    y: merchant.y,
                    price: item.price
                })
            }
        }
    }

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
                if (order.price < bestSeller.price) bestSeller = order
            }
            const bestSell = bestSeller as BuyData

            if(bestBuyer.price > bestSeller.price) {
                console.log(`We can make money on ${buyOrder} if...`)
                console.log(`  We buy from ${bestBuy.name} at ${bestBuy.price}`)
                console.log(`  We sell to ${bestSell.name} for ${bestSell.price}`)
            }
        }
    }

    // Look for items that cost less than G's value
    for(const sellOrder in selling) {
        let bestSeller = { price: Number.MAX_VALUE }
        for (const order of selling[sellOrder]) {
            if (order.price < bestSeller.price) bestSeller = order
        }
        const bestSell = bestSeller as BuyData

        if(!G.items[bestSell.itemName]) {
            console.error(`What is a ${bestSell.itemName}?`)
            return
        }

        if(bestSeller.price <= G.items[bestSell.itemName].g) {
            console.log(`Uhh, is it just me or is ${bestSell.name}'s ${bestSell.itemName} really cheap @ ${bestSell.price} gold?`)
        }
    }
})