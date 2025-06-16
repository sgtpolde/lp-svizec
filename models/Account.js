const mongoose = require('mongoose');
const { BASE_OPTIONS } = require('./baseOptions');

// Single LP entry
const lpRecordSchema = new mongoose.Schema(
  {
    lp: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    matchId: String,
    lpChange: Number,
    rank: String,
  },
  BASE_OPTIONS
);

const accountSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: true },
    gameName: { type: String, required: true },
    tagLine: { type: String, required: true },
    region: { type: String, required: true },
    puuid: { type: String, required: true },
    summonerId: { type: String, required: true },
    lastMatchId: String,
    lastLP: Number,
    lpHistory: [lpRecordSchema],
  },
  BASE_OPTIONS
);

// Compound unique index: prevents duplicate tracking for same user + account + region
accountSchema.index(
  { discordId: 1, puuid: 1, region: 1 },
  { unique: true, name: 'user_account_unique' }
);

// Helper – push new LP record & keep history length under limit (default 200)
accountSchema.methods.addLPRecord = function ({ lp, matchId, lpChange, rank }, max = 500) {
  this.lpHistory.push({ lp, matchId, lpChange, rank });
  if (this.lpHistory.length > max) this.lpHistory.shift();
  this.lastLP = lp;
};

module.exports = mongoose.model('Account', accountSchema);
