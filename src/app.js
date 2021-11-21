const csvtojson = require("csvtojson");
const { flatten, reject, equals, compose, uniq, pluck } = require('ramda');
const PriceRetriever = require('./price-retriever');

const formatDate = str => {
    return str.split(' ')[0].split('-').reverse().join('-');
}

var fs = require('fs');
var files = fs.readdirSync(`${__dirname}/csv-dumps`);

const promises = files.map(fileName => {
    return csvtojson().fromFile(`${__dirname}/csv-dumps/${fileName}`)
})

const getTotalProfits = (allData) => {
    return getSummary(allData)
        .filter(coinSummary => coinSummary.total >= 0)
        .map(coinSummary => coinSummary.total)
        .reduce((a, b) => a+b, 0);
}

const getTotalLosses = (allData) => {
    return getSummary(allData)
        .filter(coinSummary => coinSummary.total < 0)
        .map(coinSummary => coinSummary.total)
        .reduce((a, b) => a+b, 0);
}
const getUniqueCoins = compose(uniq, pluck('Coin'));
const transactionsByCoin = (coinNames, transactions) => coinNames
    .map(coinName => transactions.filter(transaction => transaction.Coin === coinName));

const getSummary = allData => allData.map(transactions => ({
    coin: transactions[0].tickerSymbol,
    total: transactions.map(t => t.amount).reduce((a, b) => a + b, 0)
}))
const run = async () => {
    const res = flatten(await Promise.all(promises));
    const listOfCoins = transactionsByCoin(getUniqueCoins(res), res);

    const generateData = async () => await Promise.all(listOfCoins.map(async coinList => {
        return await Promise.all(coinList.map(async (c, index) => {
            await 100 * index;
            const price = await PriceRetriever.getPrice(c.Coin, formatDate(c.UTC_Time), 'sek');
            return {
                tickerSymbol: c.Coin,
                amount: c.Change * price
            }
        }));
    }));

    const results = await generateData();

    return {
        profits: getTotalProfits(results),
        losses: getTotalLosses(results),
        summary: getSummary(results)
    }
}

run().then(console.log);