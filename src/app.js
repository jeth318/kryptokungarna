const csvtojson = require("csvtojson");
const { flatten, compose, uniq, pluck, map, filter } = require('ramda');
const PriceRetriever = require('./price-retriever');
var fs = require('fs');
var colors = require('colors');
var files = fs.readdirSync(`${__dirname}/csv-dumps`);

const sum = (a, b) => { return a + b };

const formatDate = str => {
    return str.split(' ')[0].split('-').reverse().join('-');
}

const promises = files.map(fileName => {
    return csvtojson().fromFile(`${__dirname}/csv-dumps/${fileName}`)
})

const getTotalProfits = (allData) => {
    return getSummary(allData)
        .filter(coinSummary => coinSummary.total >= 0)
        .map(coinSummary => parseFloat(coinSummary.total))
        .reduce(sum, 0).toFixed(2);
}

const getTotalLosses = (allData) => {
    return getSummary(allData)
        .filter(coinSummary => coinSummary.total < 0)
        .filter(coinSummary => coinSummary.sold > 0)
        .map(coinSummary => parseFloat(coinSummary.total))
        .reduce(sum, 0).toFixed(2);
}
const getUniqueCoins = compose(uniq, pluck('Coin'));
const transactionsByCoin = (coinNames, transactions) => coinNames
    .map(coinName => transactions.filter(transaction => transaction.Coin === coinName));

const getTotalTaxable = summary => {
    return summary
        .map(s => parseFloat(s.taxableProfit))
        .filter(p => !isNaN(p))
        .reduce(sum, 0).toFixed(2);
}

const getSummary = allData => allData.map(transactions => {
    const total = transactions
        .map(t => parseFloat(t.amountInSek))
        .reduce(sum, 0).toFixed(2);

    const coins = transactions
        .map(t => parseFloat(t.coins))
        .reduce(sum, 0).toFixed(7);

    const coinsBought = transactions
        .filter(t => t.buy)
        .map(t => parseFloat(t.coins))
        .reduce(sum, 0);
    
    const coinsSold = transactions.filter(t => t.sell).map(t => Math.abs(t.coins)).reduce(sum, 0);
    const totalPriceBought = transactions
        .filter(t=> t.buy)
        .map(t => t.amountInSek)
        .reduce(sum, 0).toFixed(2);

    const totalPriceSold = transactions
        .filter(t=> t.sell)
        .map(t => Math.abs(t.amountInSek))
        .reduce(sum, 0).toFixed(2);
    
    const averagePrice = parseFloat(totalPriceBought/coinsBought).toFixed(2); 
    const averageSellPrice = parseFloat(totalPriceSold/coinsSold).toFixed(2); 
    const taxableProfit = (coinsSold*averageSellPrice) - (coinsSold*averagePrice);
    
    return {
        coin: transactions[0].tickerSymbol,
        total,
        transactions: transactions.length,
        sold: coinsSold,
        bought: coinsBought,
        coins,
        averageBuyPrice: averagePrice,
        averageSellPrice: averageSellPrice,
        taxableProfit: parseFloat(taxableProfit).toFixed(2)
    }
})

const run = async () => {
    const res = flatten(await Promise.all(promises));
    const listOfCoins = transactionsByCoin(getUniqueCoins(res), res);
    const generateData = async () => await Promise.all(listOfCoins.map(async coinList => {
        return await Promise.all(coinList.map(async (c, index) => {
            // await 100 * index;
            const price = await PriceRetriever.getPrice(c.Coin, formatDate(c.UTC_Time), 'sek');
            return {
                tickerSymbol: c.Coin,
                amountInSek: c.Change*price,
                sell: c.Change < 0 ? true : false,
                buy: c.Change > 0 ? true : false,
                coins: c.Change
            }
        }));
    }));

    const results = await generateData();
    return {
        profits: getTotalProfits(results),
        losses: getTotalLosses(results),
        totalTaxable: getTotalTaxable(getSummary(results)),
        summary: getSummary(results).filter(s => s.sold > 0)
    }
}

run().then(res => {
    res.summary
        .filter(s => s.taxableProfit != 0)
        .map(s => {
        console.log('\n************************************');
        console.log('Betäckning/Valutakod:' + colors.brightBlue(s.coin));
        console.log('Belopp i utländsk valuta', s.total);
        console.log('Försäljningspris i SEK', s.averageSellPrice);
        console.log('Omkostnadsbelopp i SEK', s.averageBuyPrice);
        if (s.taxableProfit > 0) {
            console.log(colors.green('Vinst: ' + parseFloat(s.taxableProfit)));
        } else if (s.taxableProfit < 0) {
            console.log(colors.red('Förlust: ' + parseFloat(s.taxableProfit)));
        }
        console.log('************************************\n');
    })
});
