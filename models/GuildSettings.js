const mongoose = require('mongoose');
const { BASE_OPTIONS } = require('./baseOptions');

const guildSettingsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
  },
  BASE_OPTIONS
);

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
