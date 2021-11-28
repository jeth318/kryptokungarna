'use strict'
const fs = require('fs');
const path = require("path");
const colors = require('colors');
const coinGeckoClient = new (require('coingecko-api'))();
const { cryptoSymbol } = require('crypto-symbol');
const { nameLookup } = cryptoSymbol({});

const coinDatabasePath = __dirname + '/../data/coingecko-all-coins.json';
const historyFolderPath = __dirname + '/../data/price';

const getPrice = async function (name, dateString, currency) {
    if (!nameLookup(name)) {
        return Promise.resolve(0);
    }

    let coinInfo = await getCoinInfo(nameLookup(name));
    let historyData = await retrieveHistory(coinInfo, dateString);
    let priceInCurrency = historyData.data.market_data.current_price[currency];
    let nameSection = coinInfo.name.bold + '(' + coinInfo.symbol.toUpperCase().yellow + ')';
    let dateSection = 'date:' + dateString;
    let priceSection = 'price:' + (' ' + priceInCurrency + ' ').green + currency;

    // console.log(nameSection + " " + dateSection + " " + priceSection);
    return priceInCurrency;
};

const retrieveHistory = async function (coinInfo, dateString) {
    let fullPath = historyFolderPath + '/' + coinInfo.symbol + '/' + dateString + '.json';

    let history = undefined;
    if (fs.existsSync(fullPath)) {
        // console.log('cached coin history exists. Using that one instead.');
        history = JSON.parse(fs.readFileSync(fullPath));
    }
    else {
        // console.log('retrieving history from coin gecko for date ' + dateString + '...');
        history = await coinGeckoClient.coins.fetchHistory(coinInfo.id, {
            date: dateString,
            localization: false
        });

        ensureDirectoryExistence(fullPath);
        fs.writeFileSync(fullPath, JSON.stringify(history, null, 2));
    }
    return history;
}

const getCoinInfo = async function (name) {
    let allCoins = await getCoinDatabase();
    return allCoins.data.find(o => o.name.toLowerCase() === name.toLowerCase());
}

const getCoinDatabase = async function () {
    let allCoins = undefined;
    if (fs.existsSync(coinDatabasePath)) {
        // console.log('cached coin list exists. Using that one instead.');
        allCoins = JSON.parse(fs.readFileSync(coinDatabasePath));
    }
    else {
        // console.log('retrieving list of coins from coin gecko...');
        allCoins = await coinGeckoClient.coins.list();
        // console.log('done!');
        ensureDirectoryExistence(coinDatabasePath);
        fs.writeFileSync(coinDatabasePath, JSON.stringify(allCoins, null, 2));
    }

    return allCoins;
};

const ensureDirectoryExistence = function (filePath) {
    let dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

module.exports = { getPrice }