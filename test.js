const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex();

poloniex.returnOrderBook('BTC_ZEC', 10,(err, orderBook) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log(orderBook);
  }
});
