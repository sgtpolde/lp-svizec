// commands/clearAll.js
const { PermissionsBitField } = require('discord.js');

module.exports = {
  data: {
    name: 'clearall',
    description: 'Clear all messages from the current channel',
  },
  /**
   * Execute the clearall command.
   * @param {Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    // Check if the user has the necessary permissions
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)
    ) {
      return message.reply(
        '❌ You do not have permission to use this command.'
      );
    }

    // Check if the bot has the necessary permissions
    if (
      !message.guild.members.me.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      )
    ) {
      return message.reply(
        '❌ I need the **Manage Messages** permission to delete messages.'
      );
    }

    // Confirm with the user before proceeding
    const confirmationMessage = await message.reply(
      '⚠️ Are you sure you want to delete **ALL** messages in this channel? Type `yes` to confirm.'
    );

    // Await user confirmation
    const filter = (m) =>
      m.author.id === message.author.id && m.content.toLowerCase() === 'yes';
    try {
      await message.channel.awaitMessages({
        filter,
        max: 1,
        time: 15000,
        errors: ['time'],
      });

      // Delete the confirmation message and user's reply
      await confirmationMessage.delete().catch(console.error);
      await message.channel.bulkDelete(2).catch(console.error); // Deletes the 'yes' message and this command message

      // Start deleting messages
      let messagesDeleted = 0;
      let lastMessageId = null;

      while (true) {
        // Fetch messages in batches of 100
        const fetchedMessages = await message.channel.messages.fetch({
          limit: 100,
          before: lastMessageId,
        });

        if (fetchedMessages.size === 0) {
          break;
        }

        // Filter messages older than 14 days
        const messagesToDelete = fetchedMessages.filter(
          (msg) => msg.createdTimestamp > Date.now() - 1209600000 // 14 days in milliseconds
        );

        // Bulk delete messages less than 14 days old
        if (messagesToDelete.size > 0) {
          await message.channel
            .bulkDelete(messagesToDelete, true)
            .catch(console.error);
          messagesDeleted += messagesToDelete.size;
        }

        // For messages older than 14 days, delete individually with delay to respect rate limits
        const oldMessages = fetchedMessages.filter(
          (msg) => msg.createdTimestamp <= Date.now() - 1209600000
        );

        for (const [id, msg] of oldMessages) {
          await msg.delete().catch(console.error);
          messagesDeleted++;
          // Wait for 200ms to avoid hitting rate limits
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // Update lastMessageId to continue fetching earlier messages
        lastMessageId = fetchedMessages.last().id;
      }

      // Send a confirmation message
      message.channel
        .send(`✅ Successfully deleted ${messagesDeleted} messages.`)
        .then((msg) => {
          setTimeout(() => msg.delete().catch(console.error), 5000); // Delete the confirmation after 5 seconds
        });
    } catch (error) {
      console.error(error);
      message.reply('❌ Command cancelled or an error occurred.');
    }
  },
};
