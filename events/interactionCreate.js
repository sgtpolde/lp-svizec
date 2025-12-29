// events/interactionCreate.js

import { MessageFlags } from 'discord.js';
import logger from '../utils/logger.js';

const childLogger = logger.child({ label: 'events/interactionCreate' });

export default {
  name: 'interactionCreate',

  async execute(interaction, client) {
    // Only handle chat input commands (slash commands)
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      childLogger.warn(`Unknown command: ${interaction.commandName}`);
      await interaction.reply({
        content: '❌ Unknown command.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const timer = `${command.data.name}-${interaction.id}`;
    childLogger.time(timer);

    try {
      await command.execute(interaction, client);
      childLogger.timeEnd(timer, `by ${interaction.user.tag}`);
    } catch (err) {
      childLogger.error(`Command "${command.data.name}" failed: ${err.stack || err}`);

      const errorMessage = '❌ An unexpected error occurred while executing that command.';

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorMessage);
        } else {
          await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
        }
      } catch (replyError) {
        childLogger.error(`Failed to send error message: ${replyError.message}`);
      }
    }
  },
};
