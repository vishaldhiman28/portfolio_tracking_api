const Joi = require('joi');
const { model } = require('../../models/trade_model');


const TradeSchema = Joi.object().keys({
      ticker_symbol: Joi.string().required().uppercase(),
      share_price: Joi.number().min(0),
      shares: Joi.number().required().min(1),
      move: Joi.string().required().valid('++','--'),
    },
);

module.exports = TradeSchema
