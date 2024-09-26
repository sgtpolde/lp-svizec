// models/Account.js
const mongoose = require('mongoose');

const lpRecordSchema = new mongoose.Schema({
  lp: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  matchId: { type: String },
  lpChange: { type: Number },
  rank: { type: String },
});

const accountSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  gameName: { type: String, required: true }, // Riot ID - gameName
  tagLine: { type: String, required: true }, // Riot ID - tagLine
  region: { type: String, required: true }, // Server
  puuid: { type: String, required: true }, // PUUID from Riot Account API
  summonerId: { type: String, required: true }, // Summoner ID from Summoner API
  lastMatchId: { type: String },
  lastLP: { type: Number }, // To track last known LP
  lpHistory: [lpRecordSchema], // Array of LP records
});

module.exports = mongoose.model('Account', accountSchema);
