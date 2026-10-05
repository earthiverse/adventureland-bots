/**
 * Shared ALData market fetch for /trade and simulateTrade.
 */
import {
    collectMerchantOffers,
    collectMerchantSwapDealRows,
    mergeMerchantOffers,
    sortMerchantOffers,
    type MergedMerchantOffer,
} from "./tradeMessage.js"
import { collectDealRows, type DealRow, type OwnerTrades } from "./tradeDeals.js"

export type TradeMarketData = {
    buying: MergedMerchantOffer[]
    selling: MergedMerchantOffer[]
    swapOffering: DealRow[]
    swapWanting: DealRow[]
    dealWts: DealRow[]
    dealWtb: DealRow[]
    merchantsOk: boolean
    tradesOk: boolean
}

function emptyMarket(merchantsOk: boolean, tradesOk: boolean): TradeMarketData {
    return {
        buying: [],
        selling: [],
        swapOffering: [],
        swapWanting: [],
        dealWts: [],
        dealWtb: [],
        merchantsOk,
        tradesOk,
    }
}

/** Fetch /merchants + /trades and collect gold stands, stand swaps, and bank deals. */
export async function fetchTradeMarket(baseUrl: string, item: string): Promise<TradeMarketData> {
    const root = baseUrl.replace(/\/$/, "")
    const [merchantsResponse, tradesResponse] = await Promise.all([
        fetch(`${root}/merchants/`),
        fetch(`${root}/trades`),
    ])

    const merchantsOk = merchantsResponse.status === 200
    const tradesOk = tradesResponse.status === 200
    const market = emptyMarket(merchantsOk, tradesOk)

    if (merchantsOk) {
        const data: unknown = await merchantsResponse.json()
        const collected = collectMerchantOffers(data, item)
        market.buying = sortMerchantOffers(mergeMerchantOffers(collected.buying), "buy")
        market.selling = sortMerchantOffers(mergeMerchantOffers(collected.selling), "sell")
        const swaps = collectMerchantSwapDealRows(data, item)
        market.swapOffering = swaps.offering
        market.swapWanting = swaps.wanting
    }

    if (tradesOk) {
        const owners = (await tradesResponse.json()) as OwnerTrades[]
        const deals = collectDealRows(owners, item)
        market.dealWts = deals.wts
        market.dealWtb = deals.wtb
    }

    return market
}

export function tradeMarketHasListings(market: TradeMarketData): boolean {
    return (
        market.buying.length > 0 ||
        market.selling.length > 0 ||
        market.swapOffering.length > 0 ||
        market.swapWanting.length > 0 ||
        market.dealWts.length > 0 ||
        market.dealWtb.length > 0
    )
}
