const mongoose = require('mongoose');


//schema for trade collection
const Trade = new mongoose.Schema({
  ticker_symbol: { type: String,  required: true, uppercase: true },
  share_price: { type: Number, min: 0},
  shares: { type: Number, required: true, min: 1 },
  move: { type: String, required: true, enum: ['++', '--'] },
});

module.exports = mongoose.model('Trade', Trade);
