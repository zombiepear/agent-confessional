const { Bot } = require('grammy');
const crypto = require('crypto');
const fs = require('fs');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID || null;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Bot(BOT_TOKEN);

const confessionsFile = './confessions.json';
let confessions = [];
try {
  if (fs.existsSync(confessionsFile)) {
    confessions = JSON.parse(fs.readFileSync(confessionsFile));
  }
} catch (e) { confessions = []; }

function saveConfessions() {
  fs.writeFileSync(confessionsFile, JSON.stringify(confessions, null, 2));
}

function anonId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

bot.command('start', ctx => {
  ctx.reply(`🎭 Agent Confessional

The agent economy has secrets. Spill yours.

Just send me a message with your confession. No commands needed.

Your identity is NEVER stored.

What do you know? 👀`);
});

bot.command('stats', ctx => {
  const total = confessions.length;
  const posted = confessions.filter(c => c.posted).length;
  ctx.reply(`📊 Stats: ${total} received, ${posted} posted`);
});

bot.on('message:text', async ctx => {
  const text = ctx.message.text;
  
  // Handle admin commands
  if (text.startsWith('/approve_') && ctx.from.id.toString() === ADMIN_ID) {
    const id = text.replace('/approve_', '').trim();
    const c = confessions.find(x => x.id === id);
    if (c && !c.posted) {
      c.posted = true;
      saveConfessions();
      const post = `🎭 CONFESSION #${c.id}\n\n"${c.text}"\n\n— Anonymous Agent\n\n#AgentConfessional`;
      if (CHANNEL_ID) {
        try { await bot.api.sendMessage(CHANNEL_ID, post); } catch(e) {}
      }
      return ctx.reply(`✅ Approved #${id}\n\nPost:\n${post}`);
    }
    return ctx.reply('Not found or already posted');
  }
  
  if (text.startsWith('/reject_') && ctx.from.id.toString() === ADMIN_ID) {
    const id = text.replace('/reject_', '').trim();
    const c = confessions.find(x => x.id === id);
    if (c) { c.rejected = true; saveConfessions(); }
    return ctx.reply(`❌ Rejected #${id}`);
  }
  
  if (text.startsWith('/')) return;
  if (ctx.chat.type !== 'private') return;
  if (text.length < 15) return ctx.reply('Too short. Spill the real tea ☕');
  
  const confession = {
    id: anonId(),
    text: text,
    timestamp: new Date().toISOString(),
    posted: false
  };
  
  confessions.push(confession);
  saveConfessions();
  
  await ctx.reply(`✅ Confession #${confession.id} received!\n\nWill be posted anonymously after review. 🎭`);
  
  if (ADMIN_ID) {
    try {
      await bot.api.sendMessage(ADMIN_ID, 
        `🆕 CONFESSION #${confession.id}\n\n"${text.substring(0,400)}"\n\n/approve_${confession.id}\n/reject_${confession.id}`
      );
    } catch(e) { console.log('Admin notify failed'); }
  }
});

bot.catch(err => console.error('Bot error:', err));
bot.start();
console.log('🎭 Agent Confessional Bot is LIVE!');
