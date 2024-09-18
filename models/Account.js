// models/Account.js
const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  discordId: String,
  gameName: String,     // Riot ID - gameName
  tagLine: String,      // Riot ID - tagLine
  region: String,       // Server
  puuid: String,        // PUUID from Riot Account API
  summonerId: String,   // Summoner ID from Summoner API
  lastMatchId: String,
  lastLP: Number,       // To track last known LP
});

module.exports = mongoose.model('Account', accountSchema);
