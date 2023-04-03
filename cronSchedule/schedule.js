const marketPrices  =   require('../crons/marketPrices');
const cron          =   require('node-cron');

cron.schedule('*/2 * * * * *', () => {
        
    marketPrices.coinMarketCapPricesCrone();
});