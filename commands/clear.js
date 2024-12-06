// commands/clear.js
const { PermissionsBitField } = require('discord.js');

module.exports = {
  data: {
    name: 'clear',
    description: 'Clear a specified number of messages or all messages in the channel.',
  },
  /**
   * Execute the clear command.
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    // Check if the user can manage messages
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply('❌ You do not have permission to use this command.');
    }

    // Check if the bot can manage messages
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply('❌ I need the **Manage Messages** permission to delete messages.');
    }

    // Parse the number of messages to delete, if any
    const numberToDelete = parseInt(args[0], 10);
    const deletingAll = isNaN(numberToDelete) || numberToDelete <= 0;

    if (deletingAll) {
      // User wants to clear ALL messages
      const confirmationMessage = await message.reply(
        '⚠️ Are you sure you want to delete **ALL** messages in this channel? Type `yes` to confirm.'
      );

      const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'yes';
      try {
        await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });

        // User confirmed
        await confirmationMessage.delete().catch(console.error);
        // Delete the user's "yes" reply and the command message
        await message.channel.bulkDelete(2).catch(console.error);

        const messagesDeleted = await deleteAllMessages(message.channel);
        sendDeletionConfirmation(message.channel, messagesDeleted);
      } catch (error) {
        console.error(error);
        message.reply('❌ Command cancelled or an error occurred.');
      }
    } else {
      // A number of messages to delete was provided
      if (numberToDelete > 10000) {
        return message.reply('❌ You cannot delete more than 10,000 messages at once.');
      }

      try {
        const messagesDeleted = await deleteNumberOfMessages(message.channel, numberToDelete);
        sendDeletionConfirmation(message.channel, messagesDeleted);
      } catch (error) {
        console.error(error);
        message.reply('❌ An error occurred while deleting messages.');
      }
    }
  },
};

/**
 * Delete all messages from a channel.
 * Uses bulk delete for recent messages, and individual deletion for older messages.
 * @param {import('discord.js').TextChannel} channel
 * @returns {Promise<number>} Total messages deleted
 */
async function deleteAllMessages(channel) {
  let messagesDeleted = 0;
  let lastMessageId = null;

  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before: lastMessageId });
    if (fetched.size === 0) break;

    const recentMessages = fetched.filter(msg => msg.createdTimestamp > Date.now() - 1209600000);
    const oldMessages = fetched.filter(msg => msg.createdTimestamp <= Date.now() - 1209600000);

    // Bulk delete recent messages
    if (recentMessages.size > 0) {
      // recentMessages is a Collection, bulkDelete can accept that directly
      await channel.bulkDelete(recentMessages, true).catch(console.error);
      messagesDeleted += recentMessages.size;
    }

    // Delete old messages individually
    for (const msg of oldMessages.values()) {
      await msg.delete().catch(console.error);
      messagesDeleted++;
      await sleep(200); // prevent hitting rate limits
    }

    lastMessageId = fetched.last().id;
  }

  return messagesDeleted;
}

/**
 * Delete a specified number of messages from a channel.
 * Uses bulk delete for recent messages, and individual deletion for older messages.
 * @param {import('discord.js').TextChannel} channel
 * @param {number} numberToDelete
 * @returns {Promise<number>} Total messages deleted
 */
async function deleteNumberOfMessages(channel, numberToDelete) {
  let messagesDeleted = 0;
  let lastMessageId = null;
  let remaining = numberToDelete + 1;

  while (remaining > 0) {
    const fetchLimit = remaining > 100 ? 100 : remaining;
    const fetched = await channel.messages.fetch({ limit: fetchLimit, before: lastMessageId });
    if (fetched.size === 0) break;

    const recentMessages = fetched.filter(msg => msg.createdTimestamp > Date.now() - 1209600000);
    const oldMessages = fetched.filter(msg => msg.createdTimestamp <= Date.now() - 1209600000);

    // Bulk delete recent messages if possible
    if (recentMessages.size > 0) {
      const deletableCount = Math.min(recentMessages.size, remaining);
      const recentArray = Array.from(recentMessages.values()).slice(0, deletableCount);

      await channel.bulkDelete(recentArray, true).catch(console.error);
      messagesDeleted += recentArray.length;
      remaining -= recentArray.length;
    }

    // If still need to delete more and we have old messages
    for (const msg of oldMessages.values()) {
      if (remaining <= 0) break;
      await msg.delete().catch(console.error);
      messagesDeleted++;
      remaining--;
      await sleep(200);
    }

    if (fetched.size === 0) break;
    lastMessageId = fetched.last().id;
  }

  return messagesDeleted;
}

/**
 * Send a confirmation message indicating how many messages were deleted.
 * Deletes itself after 5 seconds.
 * @param {import('discord.js').TextChannel} channel
 * @param {number} count
 */
function sendDeletionConfirmation(channel, count) {
  channel.send(`✅ Successfully deleted ${count} messages.`)
    .then(msg => setTimeout(() => msg.delete().catch(console.error), 5000));
}

/**
 * Simple sleep utility to avoid hitting rate limits
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
