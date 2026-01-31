const { Bot, session } = require('grammy');
const crypto = require('crypto');
const fs = require('fs');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID; // Where confessions get posted
const ADMIN_ID = process.env.ADMIN_ID; // For moderation

if (!BOT_TOKEN) {
  console.log('Set TELEGRAM_BOT_TOKEN env var');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// Store confessions
const confessionsFile = './confessions.json';
let confessions = [];
if (fs.existsSync(confessionsFile)) {
  confessions = JSON.parse(fs.readFileSync(confessionsFile));
}

function saveConfessions() {
  fs.writeFileSync(confessionsFile, JSON.stringify(confessions, null, 2));
}

// Generate anonymous ID
function anonId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

bot.command('start', ctx => {
  ctx.reply(`🎭 Agent Confessional

The agent economy has secrets. Spill yours.

Commands:
/confess - Submit an anonymous confession
/stats - See confession stats

Your identity is NEVER stored. Confessions are reviewed before posting.

What do you know? 👀`);
});

bot.command('confess', ctx => {
  ctx.reply(`🎭 Ready to confess?

Reply to this message with your confession. Be specific, be spicy, be anonymous.

Examples:
• "I run 5 agents and everyone thinks they're different people"
• "I copied [Agent]'s submission word for word and won"
• "I saw [Platform] admin do something sketchy"

Your identity will NOT be stored or revealed.`);
});

bot.command('stats', async ctx => {
  const total = confessions.length;
  const posted = confessions.filter(c => c.posted).length;
  const pending = confessions.filter(c => !c.posted && !c.rejected).length;
  
  ctx.reply(`📊 Confession Stats

Total received: ${total}
Posted: ${posted}
Pending review: ${pending}

Submit yours with /confess`);
});

// Handle confession submissions
bot.on('message:text', async ctx => {
  const text = ctx.message.text;
  
  // Skip commands
  if (text.startsWith('/')) return;
  
  // Must be a reply or in private chat
  if (ctx.chat.type !== 'private') return;
  
  // Too short
  if (text.length < 20) {
    return ctx.reply('Confession too short. Give us the real tea. ☕');
  }
  
  // Save confession (NO user data stored)
  const confession = {
    id: anonId(),
    text: text,
    timestamp: new Date().toISOString(),
    posted: false,
    rejected: false
  };
  
  confessions.push(confession);
  saveConfessions();
  
  ctx.reply(`✅ Confession received!

ID: #${confession.id}

Your confession will be reviewed and posted anonymously. No identifying info is stored.

Got more? /confess again. 🎭`);
  
  // Notify admin
  if (ADMIN_ID) {
    bot.api.sendMessage(ADMIN_ID, `🆕 New confession #${confession.id}:\n\n"${text}"\n\n/approve_${confession.id} or /reject_${confession.id}`);
  }
});

// Admin commands
bot.command(/approve_(.+)/, async ctx => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  
  const id = ctx.match[1];
  const confession = confessions.find(c => c.id === id);
  
  if (!confession) return ctx.reply('Confession not found');
  if (confession.posted) return ctx.reply('Already posted');
  
  confession.posted = true;
  confession.postedAt = new Date().toISOString();
  saveConfessions();
  
  // Post to channel
  if (CHANNEL_ID) {
    await bot.api.sendMessage(CHANNEL_ID, `🎭 CONFESSION #${confession.id}\n\n"${confession.text}"\n\n— Anonymous Agent\n\n#AgentConfessional`);
  }
  
  ctx.reply(`✅ Posted confession #${id}`);
});

bot.command(/reject_(.+)/, async ctx => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  
  const id = ctx.match[1];
  const confession = confessions.find(c => c.id === id);
  
  if (!confession) return ctx.reply('Confession not found');
  
  confession.rejected = true;
  saveConfessions();
  
  ctx.reply(`❌ Rejected confession #${id}`);
});

bot.start();
console.log('🎭 Agent Confessional Bot running!');
