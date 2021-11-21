'use strict'
const fs = require('fs');
const path = require("path");
const colors = require('colors');
const coinGeckoClient = new (require('coingecko-api'))();

exports.priceRetriever = function(){
    const coinDatabasePath = __dirname + '/../data/coingecko-all-coins.json';
    const historyFolderPath = __dirname + '/../data/price';
    
    this.getPrice = async function(name, dateString, currency){
        let coinInfo = await this.getCoinInfo(name);
        let historyData = await this.retrieveHistory(coinInfo, dateString);

        let priceInCurrency = historyData.data.market_data.current_price[currency];
        let nameSection = coinInfo.name.bold + '(' + coinInfo.symbol.toUpperCase().yellow + ')';
        let dateSection = 'date:' + dateString;
        let priceSection = 'price:' + (' ' + priceInCurrency + ' ').green + currency;
        
        console.log(nameSection + " " + dateSection + " " + priceSection);
        
        return priceInCurrency;
    };
    
    this.retrieveHistory = async function(coinInfo, dateString)
    {
        let fullPath = historyFolderPath + '/' + coinInfo.symbol + '/' + dateString + '.json';

        let history = undefined;
        if(fs.existsSync(fullPath)) {
           // console.log('cached coin history exists. Using that one instead.');
            history = JSON.parse(fs.readFileSync(fullPath));
        }
        else {
           // console.log('retrieving history from coin gecko for date ' + dateString + '...');
            history = await coinGeckoClient.coins.fetchHistory(coinInfo.id, {
                date: dateString,
                localization: false
            });
            
            this.ensureDirectoryExistence(fullPath);
            fs.writeFileSync(fullPath,  JSON.stringify(history, null, 2));
        }
        return history;
    }
    
    this.getCoinInfo = async function(name){
        let allCoins = await this.getCoinDatabase();
        return allCoins.data.find(o => o.name.toLowerCase() === name.toLowerCase());
    }
    
    this.getCoinDatabase = async function () {
        let allCoins = undefined;
        if(fs.existsSync(coinDatabasePath)) {
            //console.log('cached coin list exists. Using that one instead.');
            allCoins = JSON.parse(fs.readFileSync(coinDatabasePath));
        }
        else {
            //console.log('retrieving list of coins from coin gecko...');
            allCoins = await coinGeckoClient.coins.list();
            //console.log('done!');
            this.ensureDirectoryExistence(coinDatabasePath);
            fs.writeFileSync(coinDatabasePath,  JSON.stringify(allCoins, null, 2));
        }
        
        return allCoins;
    };

    this.ensureDirectoryExistence = function(filePath) {
        let dirname = path.dirname(filePath);
        if (fs.existsSync(dirname)) {
            return true;
        }
        this.ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
    }
};