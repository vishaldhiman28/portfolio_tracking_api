const { json } = require('body-parser');
const PortfolioModel = require('../models/portfolio_model');
const  TradeModel =  require('../models/trade_model');
const Joi = require('joi');
const TradeJsonSchema = require('./validator/portfolio.validator');

const current_price = 100;


// buy security 
const securityBuy = async (data, security) => {
    
    // if security already exist update it
    if(security)
    {
     security.average_buy_price = ((security.average_buy_price * security.shares) + (data.share_price * data.shares)) / (security.shares + data.shares);
     security.shares += data.shares;
     
    }
    else
    {
        // if security does not exist create new 
        security = new PortfolioModel({
            ticker_symbol: data.ticker_symbol,
            average_buy_price: data.share_price,
            shares: data.shares,
        })
    }
    security = await security.save();
    return security;
};

// create new trade
const newTrade = async (data) => {
    let trade = new TradeModel({
        ticker_symbol: data.ticker_symbol,
        share_price: data.share_price,
        shares: data.shares,
        move: data.move
    })
    trade = await trade.save();
    return trade;
};

// sell the shares from security
const securitySell = async (shares, security) => {
    security.shares -= shares;
    security = await security.save();
    return security;
  };
  


// remove trade from security 
const securityTradeRemove = async (security, trade) => {

    // increase shares if sell
    if (trade.move === '--')
    {
        security.shares += trade.shares;
    } 
    else
    {
      // find new average after removing the share which were bought
      let new_avg = ((security.average_buy_price * security.shares) - (trade.share_price * trade.shares)) / (security.shares - trade.shares);
      if(new_avg>0)
      {
       security.average_buy_price = new_avg;
      }
      else
      {
        security.average_buy_price = 0;
      }
      security.shares -= trade.shares;
      
    } 
    security = await security.save();
    return security;
  };
  

// to restore removed trade
const restoreTrade = async (trade, security) => {
    if (trade.move === '++') 
    {
        security = await securityBuy(trade, security);
    }
    else
    {
        security = await securitySell(trade.shares, security)
    }
    return  security;
}


// Add a trade for the security
exports.addTrade = async (req, res) => {
    try
    {
            // Validate request body
            let data = req.body;
            const validation = TradeJsonSchema.validate(data);
            if (validation.error) {
                return res.status(400).json({ error: validation.error });
            }
                
            // check if security exist
            let security = await PortfolioModel.findOne({ticker_symbol: data.ticker_symbol});
            
            // for selling the shares
            if(data.move === "--") 
            {
                if(!security)
                {
                    res.status(400).json({
                    error_msg: "Trade invalid, security does not exist for the company, so you can not sell."
                    });
                }
                else if(security.share<data.shares)
                {
                    return res.status(400).json({
                        error_msg: "Trade invalid, the number of shares present of the security are not enough for sell."
                    });    
                }
                else
                {
                    security = await securitySell(data.shares, security);
                    if(!data.share_price)
                    {
                    data.share_price = current_price;
                    }
                    let  trade = await newTrade(data);
                    return res.status(201).json(trade);
                }
            }
            else
            {
                // for buying the shares
                security = await securityBuy(data, security);
                let  trade = await newTrade(data);
                return res.status(201).json(trade);
            }
    }
    catch(err){
        console.log(err.message);
        return res.status(500).json({
            error_msg: "Server Error"
        });
    }
};


// update the given trade
exports.updateTrade = async (req, res) => {
   try{
        const trade_id = req.params.id;

        // validate trade id
        if (!trade_id || !(trade_id.match(/^[0-9a-fA-F]{24}$/))) 
        {
            return res.status(400).json({
                error_msg: "Invalid trade id."
            });
        } 

        const reqData = req.body;

        // validate request body
        const validation = TradeJsonSchema.validate(reqData);
        if (validation.error) {
            return res.status(400).json({ error: validation.error });
        }
        
        
        
        // find trade by id
        let trade = await TradeModel.findById(trade_id);
        
        // find security for the trade
        let security = await PortfolioModel.findOne({ ticker_symbol: trade.ticker_symbol});
        
        if (!trade)
        { 
            return res.status(400).json({
                error_msg: "The trade for the given id is not associated with portfolio."
            });
        }

        // if trade is for the same security and move is also the same 
        if((trade.ticker_symbol === reqData.ticker_symbol) && (trade.move === reqData.move))
        {
            // if no change in the trade values.
            if((trade.share_price === reqData.share_price) && (trade.shares === reqData.shares))
            {
                return res.status(400).json({
                    info: "There is no change in the values for the updated trade."
                });
            }
            
            // if trade is for buying the shares
            if(reqData.move === '++') 
            {
            if( (security.shares<trade.shares ||(trade.shares>reqData.shares) && (security.shares + reqData.shares - trade.shares)<0 ))
            {
                return res.status(400).json({
                    error_msg: "Invalid update, There is not enough shares of the security to update the trade."
                });
            }

            let new_avg = ((security.average_buy_price * security.shares) - (trade.share_price * trade.shares)) / (security.shares - trade.shares);
            if(new_avg>0)
            {
                security.average_buy_price = new_avg;
            }
            else
            {
                security.average_buy_price = 0;
            }

                security.shares -= trade.shares;

                security.average_buy_price = ((security.average_buy_price * security.shares) + (reqData.share_price * reqData.shares)) / (security.shares + reqData.shares);
                security.shares += reqData.shares;
                security = await security.save();
            }
            else 
            {
                if((trade.shares<reqData.shares) && (security.shares - reqData.shares + trade.shares)<0 )
                {
                return res.status(400).json({
                    error_msg: "Invalid update, there is not enough shares of the security to update the trade."
                });
                }
            security.shares += trade.shares;
            security.shares -= reqData.shares;
            security = await security.save();
            }
            trade.share_price = reqData.share_price;
            trade.shares = reqData.shares;
            trade = await trade.save();
            return res.status(200).json(trade);
        }
        else
        {
            // if the trade is not for the same security or trade move is different than new trade

            if (trade.move === '++' && security.shares<trade.shares)
            {
                return res.status(400).json({
                    error_msg: "Invalid update, there is not enough shares of the security to update the trade."
                });    
            }   

            // remove the old trade
            security = await securityTradeRemove(security, trade);
            
            // find security for the new trade
            security = await PortfolioModel.findOne({ ticker_symbol: reqData.ticker_symbol });
        
            if(reqData.move === "--") 
            {
                if(!security || security.shares<reqData.shares)
                {
                    //restore deleted trade of the security
                    security = await PortfolioModel.findOne({ ticker_symbol: trade.ticker_symbol});
                    security = await restoreTrade(trade,security);

                    if(!security)
                    {
                        msg = {
                            error_msg: "Invalid update, security does not exist for the company, so you can not update(sell)."
                        }
                    }
                    else{
                        msg = {
                            error_msg: "Invalid update, there is not enough shares of the security to update the trade."
                        }
                    }
                    res.status(400).json(msg);
                }
                else
                {
                    security = await securitySell(reqData.shares, security);
                    trade.ticker_symbol = reqData.ticker_symbol;
                    if(!reqData.share_price)
                    {
                    trade.share_price = current_price;
                    }
                    else{
                        trade.share_price = reqData.share_price;
                    }
                    trade.shares = reqData.shares;
                    trade.move = reqData.move;
                    trade = await trade.save();
                    return res.status(200).json(trade);
                }
            }
            else
            {
                security = await securityBuy(reqData, security);
                trade.ticker_symbol = reqData.ticker_symbol;
                trade.share_price = reqData.share_price;
                trade.shares = reqData.shares;
                trade.move = reqData.move;
                trade = await trade.save();
                return res.status(200).json(trade);
            }
            
        }
   }
    catch(err){
        console.log(err.message);
        return res.status(500).json({
            error_msg: "Server Error"
        });
    }
    
};

// remove the given trade 
exports.removeTrade = async (req, res) => {
    try{
        const trade_id = req.params.id;

        // validate trade id
        if (!trade_id || !(trade_id.match(/^[0-9a-fA-F]{24}$/))) 
        {
            return res.status(400).json({
                error_msg: "Invalid trade id."
            });
        } 

        // find trade by id 
        let trade = await TradeModel.findById(trade_id);

        if (!trade)
        { 
            return res.status(400).json({
                error_msg: "The trade for the given id is not associated with portfolio."
            });
        }

        // find security corresponding to the trade ticker symbol
        let security = await PortfolioModel.findOne({ ticker_symbol: trade.ticker_symbol });

        // check if valid trade or not
        if (trade.move === '++' && (security.shares<trade.shares))
        {
            return res.status(400).json({
                error_msg: "The trade can not be removed, because It leaves security of the company with invalid number of shares."
            });   
        }

        
        // remove trade from security based on buy or sell and update security accordingly
        security = await securityTradeRemove(security, trade);
        
        // remove trade using id
        trade = await TradeModel.findByIdAndRemove(trade_id);
        
        return res.status(200).json(trade);
    }
    catch(err){
        console.log(err.message);
        return res.status(500).json({
            error_msg: "Server Error"
        });
    }

 };


// to fetch portfolio 
exports.fetchPortfolio = async (req, res) => {
    try{
        //extract all securities symbols
        let all_securities = await PortfolioModel.find({shares: { $ne: 0 } }).select('ticker_symbol');
        
        all_securities = all_securities.map((security) => security.ticker_symbol);
        
        // based  on security symbols map the trades for them 
        const overall_portfolio = await Promise.all(
        all_securities.map(async (ticker_symbol) => {
        const security_trades = await TradeModel.find({ ticker_symbol : ticker_symbol}).select('-ticker_symbol');
        return {
            [ticker_symbol]: {
            security_trades,
            },
        };
        }));
        return res.status(200).json(overall_portfolio);
    }
    catch(err){
        console.log(err.message);
        return res.status(500).json({
            error_msg: "Server Error"
        });
    }
}


// simple function to fetch overall holdings
exports.fetchHoldings = async (req, res) => {
    try{
        const holdings = await PortfolioModel.find({shares: { $ne: 0 }});
        return res.status(200).json(holdings);
    }
    catch(err){
        console.log(err.message);
        return res.status(500).json({
            error_msg: "Server Error"
        });
    }

};


// function to fetch overall returns
exports.fetchReturns = async (req, res) => {
    try{
        // find all securities
        const all_securities = await PortfolioModel.find({shares: { $ne: 0 }});
        
        // reduce all securities to total return 
        const overall_returns = all_securities.reduce(
            (total_return, security) => { 
            return total_return  + ((current_price - security.average_buy_price) * security.shares);
            },0);
        return res.status(200).json({'returns': overall_returns });
    }
    catch(err){
        console.log(err.message);
        return res.status(500).json({
            error_msg: "Server Error"
        });
    }
};