'use strict'
var priceRetriever = new (require('../src/price-retriever').priceRetriever)();

function getPrices() {
    priceRetriever.getPrice('Avalanche','AVAX', '20-11-2021', 'sek');
    priceRetriever.getPrice('Cardano','ADA', '16-01-2019', 'sek');
    priceRetriever.getPrice('Litecoin','LTC', '5-09-2020', 'sek');
    priceRetriever.getPrice('VeChain','VET', '8-08-2020', 'sek');
    priceRetriever.getPrice('Uniswap','UNI', '26-05-2021', 'sek');
}

getPrices();