import mongoose from 'mongoose';
import { BASE_OPTIONS } from './baseOptions.js';

const guildSettingsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
  },
  BASE_OPTIONS
);

export default mongoose.models.GuildSettings ||
  mongoose.model('GuildSettings', guildSettingsSchema);
