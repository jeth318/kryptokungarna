'use strict'
var priceRetriever = new (require('../src/price-retriever').priceRetriever)();

function getPrices() {
    priceRetriever.getPrice('Avalanche', '20-11-2021', 'sek');
    priceRetriever.getPrice('Cardano', '16-01-2019', 'sek');
    priceRetriever.getPrice('Litecoin', '5-09-2020', 'sek');
    priceRetriever.getPrice('VeChain', '8-08-2020', 'sek');
    priceRetriever.getPrice('Uniswap', '26-05-2021', 'sek');
}

getPrices();