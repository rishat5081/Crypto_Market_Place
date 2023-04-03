const CoinMarketCap = require('node-coinmarketcap');
const coinmarketcap = new CoinMarketCap();
var helperCon = require("../helper/helper");
// const fetch = require('node-fetch@2');
// import fetch from 'node-fetch'

module.exports = {
    coinMarketCapPricesCrone: async() => {
        let fetch = await import('node-fetch')

        console.log('asim')
        fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
            method: 'GET',
            headers: {
                'Postman-Token': '34a36f0e-88f4-4d46-8d2b-c0f5e620d71d',
                'cache-control': 'no-cache',
                Authorization: 'Basic ZGlnaWVib3QuY29tOllhQWxsYWg=',
                'Content-Type': 'application/json',
                'X-CMC_PRO_API_KEY': '4ebe5ba4-8e71-43e1-89a4-e386d9b3866f'
            }
        }).then(res => res.json()).then(json => {

            console.log(json.data)
            let foopData = json.data
            for (var i = 0; i < foopData.length; i++) {

                let insertedArray = {
                    name: foopData[i]['name'],
                    symbol: foopData[i]['symbol'],
                    slug: foopData[i]['slug'],
                    price: foopData[i]['quote']['USD']['price'],
                    volume_24h: foopData[i]['quote']['USD']['volume_24h'],
                    percent_change_1h: foopData[i]['quote']['USD']['percent_change_1h'],
                    percent_change_24h: foopData[i]['quote']['USD']['percent_change_24h'],
                    percent_change_7d: foopData[i]['quote']['USD']['percent_change_7d'],
                    percent_change_30d: foopData[i]['quote']['USD']['percent_change_30d'],
                    percent_change_60d: foopData[i]['quote']['USD']['percent_change_60d'],
                    percent_change_90d: foopData[i]['quote']['USD']['percent_change_90d'],
                    market_cap: foopData[i]['quote']['USD']['market_cap'],
                    created_date: new Date()
                }

                console.log(insertedArray)
                // let where = { symbol: json.data[i]['symbol'] }
                // db.collection('market_prices').updateOne(where, { $set: insertedArray }, { upsert: true }, async (err, result) => {
                //     if (err) {

                //         console.log('We are Getting some DataBase Error!!')
                //     } else {

                //         console.log('Updated SuccessFully Market Prices!!!')
                //     }
                // })

            }//end loop

        }).catch(err => console.log(err))
        
    },    
}