// commands/clear.js

import { PermissionsBitField, EmbedBuilder, Collection, SlashCommandBuilder } from 'discord.js';
import logger from '../utils/logger.js';

const childLogger = logger.child({ label: 'commands/clear' });

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
const MAX_DELETE = 10_000; // Discord hard cap we enforce

export default {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete a number of recent messages or purge the entire channel')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (leave empty to purge all)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.inGuild()) return;

    // — Permission checks —
    const missing = missingPerms(interaction);
    if (missing) {
      await interaction.reply({ content: missing, ephemeral: true });
      return;
    }

    const amount = interaction.options.getInteger('amount');
    const purgeAll = !amount;

    if (purgeAll) {
      await interaction.reply({
        content:
          '⚠️  Delete **ALL** messages in this channel? Use the button below to confirm within 30 seconds.',
        ephemeral: true,
      });

      const proceed = await confirmWithButton(interaction);
      if (!proceed) {
        await interaction.editReply({ content: '❌  Cancelled.', components: [] });
        return;
      }

      await interaction.editReply({ content: '🔄  Deleting all messages...', components: [] });
      const deleted = await purgeChannel(interaction.channel);
      await sendEmbed(
        interaction.channel,
        `Deleted **${deleted}** messages – full purge complete.`
      );
    } else {
      if (amount > MAX_DELETE) {
        await interaction.reply({
          content: `❌  You can delete at most ${MAX_DELETE} messages at once.`,
          ephemeral: true,
        });
        return;
      }
      await interaction.deferReply({ ephemeral: true });
      const deleted = await purgeChannel(interaction.channel, amount);
      await interaction.editReply(`✅  Deleted **${deleted}** messages.`);
    }
  },
};

// --------------------------------------------------------
// helpers
// --------------------------------------------------------
function missingPerms(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return '❌  You need **Manage Messages** permission to use this command.';
  }
  if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return '❌  I need **Manage Messages** permission to delete messages.';
  }
  return null;
}

/**
 * Confirm dangerous action with button – returns boolean
 */
async function confirmWithButton(interaction) {
  const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = await import('discord.js');

  const confirmButton = new ButtonBuilder()
    .setCustomId('confirm_clear')
    .setLabel('Yes, delete all messages')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_clear')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.editReply({
    content: '⚠️  Delete **ALL** messages in this channel?',
    components: [row],
  });

  try {
    const buttonInteraction = await interaction.channel.awaitMessageComponent({
      filter: i =>
        i.user.id === interaction.user.id &&
        (i.customId === 'confirm_clear' || i.customId === 'cancel_clear'),
      time: 30_000,
    });

    await buttonInteraction.deferUpdate();
    return buttonInteraction.customId === 'confirm_clear';
  } catch {
    return false;
  }
}

/**
 * Purge channel: if limit is undefined → delete everything.
 * Returns number deleted.
 */
async function purgeChannel(channel, limit) {
  let removed = 0;
  let before;
  while (limit === undefined || limit > 0) {
    const fetchSize = limit ? Math.min(limit, 100) : 100;
    const msgs = await channel.messages.fetch({ limit: fetchSize, before });
    if (!msgs.size) break;

    const [recent, older] = partitionByAge(msgs);
    if (recent.size) {
      const slice = limit ? recent.first(limit) : recent;
      const deleted = await channel
        .bulkDelete(slice, true)
        .then(c => c.size ?? c.length)
        .catch(err => {
          childLogger.warn(err);
          return 0;
        });
      removed += deleted;
      if (limit) limit -= deleted;
    }

    for (const msg of older.values()) {
      if (limit !== undefined && limit <= 0) break;
      await msg.delete().catch(() => {});
      removed++;
      if (limit) limit--;
      await sleep(250);
    }

    before = msgs.last().id;
  }
  return removed;
}

function partitionByAge(collection) {
  const recent = new Collection();
  const older = new Collection();
  const cutoff = Date.now() - TWO_WEEKS;
  for (const [id, msg] of collection) {
    (msg.createdTimestamp > cutoff ? recent : older).set(id, msg);
  }
  return [recent, older];
}

async function sendEmbed(channel, text) {
  const embed = new EmbedBuilder().setColor(0x57f287).setDescription(`✅  ${text}`).setTimestamp();
  const msg = await channel.send({ embeds: [embed] });
  setTimeout(() => msg.delete().catch(() => {}), 5_000);
}

const sleep = ms => new Promise(res => setTimeout(res, ms));
