// models/GuildSettings.js
const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
});

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
