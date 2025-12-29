// events/messageCreate.js

import { Collection } from 'discord.js';
import logger from '../utils/logger.js';

const childLogger = logger.child({ label: 'events/messageCreate' });

const PREFIX = process.env.COMMAND_PREFIX || '!';
const DEFAULT_CD_SEC = 3;

// cooldowns: Map<command, Collection<userId, expiresAt>>
const cooldowns = new Map();

// compiled once
const ARG_RX = /"([^"]+)"|'([^']+)'|(\S+)/g;

export default {
  name: 'messageCreate',

  /** @param {import("discord.js").Message} msg @param {import("discord.js").Client} client */
  async execute(msg, client) {
    if (msg.author.bot || !msg.content.startsWith(PREFIX)) return;

    // ---------- parse command + args --------------------------------------
    const body = msg.content.slice(PREFIX.length).trim();
    const [cmdNameRaw, ...args] = tokenize(body);
    if (!cmdNameRaw) return;

    const cmd = client.commands.get(cmdNameRaw.toLowerCase());
    if (!cmd) {
      await msg.reply(
        `Unknown command \`${cmdNameRaw}\`. Try \`${PREFIX}help\` for a list of commands.`
      );
      childLogger.warn(`Unknown command "${cmdNameRaw}" from ${msg.author.tag}`);
      return;
    }

    // ---------- cooldown guard -------------------------------------------
    if (await inCooldown(cmd, msg)) return;

    // ---------- run command ----------------------------------------------
    const timer = `${cmd.data.name}-${msg.id}`;
    childLogger.time(timer);
    try {
      await cmd.execute(msg, args, client);
      childLogger.timeEnd(timer, `by ${msg.author.tag}`);
    } catch (err) {
      childLogger.error(`Cmd "${cmd.data.name}" failed – ${err.stack || err}`);
      await msg.reply('❌  An unexpected error occurred while executing that command.');
    }
  },
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function tokenize(str) {
  const tokens = [];
  let m;
  ARG_RX.lastIndex = 0; // reset regex state
  while ((m = ARG_RX.exec(str)) !== null) tokens.push(m[1] || m[2] || m[3]);
  return tokens;
}

async function inCooldown(cmd, msg) {
  const bucket =
    cooldowns.get(cmd.data.name) ??
    cooldowns.set(cmd.data.name, new Collection()).get(cmd.data.name);

  const now = Date.now();
  const cdMs = (cmd.cooldown ?? DEFAULT_CD_SEC) * 1000;
  const exp = bucket.get(msg.author.id);

  if (exp && now < exp) {
    const left = ((exp - now) / 1000).toFixed(1);
    await msg.reply(`Please wait ${left}s before using \`${cmd.data.name}\` again.`);
    return true;
  }

  bucket.set(msg.author.id, now + cdMs);
  setTimeout(() => bucket.delete(msg.author.id), cdMs);
  return false;
}
