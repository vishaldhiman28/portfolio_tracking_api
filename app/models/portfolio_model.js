const mongoose = require('mongoose');


//schema for portfolio collection
const Portfolio = new mongoose.Schema({
  ticker_symbol: { type: String,  required: true, unique: true, uppercase: true },
  average_buy_price: { type: Number, required: true, min: 0 },
  shares: { type: Number, required: true, min: 0 },
});




module.exports = mongoose.model('Portfolio', Portfolio);
