// commands/clear.js

const { PermissionsBitField, EmbedBuilder, Collection } = require('discord.js');
const logger = require('../utils/logger').child({ label: 'commands/clear' });

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
const MAX_DELETE = 10_000; // Discord hard cap we enforce

module.exports = {
  data: {
    name: 'clear',
    description: 'Delete a number of recent messages or purge the entire channel.',
  },

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    if (!message.inGuild()) return;

    // — Permission checks —
    const missing = missingPerms(message);
    if (missing) {
      await message.reply(missing);
      return;
    }

    const amount = parseInt(args[0], 10);
    const purgeAll = !amount || amount <= 0;

    if (purgeAll) {
      const proceed = await confirm(
        message,
        '⚠️  Delete **ALL** messages in this channel? Type `yes` within 15 s to confirm.'
      );
      if (!proceed) return;
      const deleted = await purgeChannel(message.channel);
      await sendEmbed(message.channel, `Deleted **${deleted}** messages – full purge complete.`);
    } else {
      if (amount > MAX_DELETE) {
        await message.reply(`❌  You can delete at most ${MAX_DELETE} messages at once.`);
        return;
      }
      const deleted = await purgeChannel(message.channel, amount + 1); // +1 to include command msg
      await sendEmbed(message.channel, `Deleted **${deleted}** messages.`);
    }
  },
};

// --------------------------------------------------------
// helpers
// --------------------------------------------------------
function missingPerms(message) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return '❌  You need **Manage Messages** permission to use this command.';
  }
  if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return '❌  I need **Manage Messages** permission to delete messages.';
  }
  return null;
}

/**
 * Confirm dangerous action – returns boolean
 */
async function confirm(message, prompt) {
  const promptMsg = await message.reply(prompt);
  try {
    const collected = await message.channel.awaitMessages({
      filter: m => m.author.id === message.author.id && m.content.toLowerCase() === 'yes',
      max: 1,
      time: 15_000,
      errors: ['time'],
    });
    await promptMsg.delete().catch(() => {});
    await collected
      .first()
      .delete()
      .catch(() => {});
    return true;
  } catch {
    await promptMsg.edit('❌  Cancelled.');
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
          logger.warn(err);
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
