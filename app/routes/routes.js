

//all available end points for the API

module.exports = (app) => {
    const portfolio = require('../controllers/portfolio.controller');

    app.post('/addTrade', portfolio.addTrade);

    app.put('/updateTrade/:id', portfolio.updateTrade);

    app.delete('/removeTrade/:id', portfolio.removeTrade);
    
    app.get('/portfolio', portfolio.fetchPortfolio);

    app.get('/holdings', portfolio.fetchHoldings);

    app.get('/returns',portfolio.fetchReturns);
}