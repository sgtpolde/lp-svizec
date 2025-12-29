// deploy-commands.js
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
  const command = await import(fileUrl);

  if (command.default?.data) {
    // Check if data has toJSON method (SlashCommandBuilder)
    if (typeof command.default.data.toJSON === 'function') {
      commands.push(command.default.data.toJSON());
    } else {
      logger.warn(`Command ${file} doesn't use SlashCommandBuilder - skipping`);
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  logger.info(`Deploying ${commands.length} slash commands...`);

  if (process.env.GUILD_ID) {
    // Guild commands (instant, for testing)
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    logger.info(`✅ Deployed ${data.length} guild commands to ${process.env.GUILD_ID}`);
  } else {
    // Global commands (takes up to 1 hour)
    const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    logger.info(`✅ Deployed ${data.length} global commands`);
  }
} catch (error) {
  logger.error(`Deployment failed: ${error.stack || error}`);
  process.exit(1);
}
