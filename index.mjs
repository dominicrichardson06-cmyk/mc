import fs from 'fs';
import { createBot } from 'mineflayer';
import { pathfinder, Movements, goals } from 'mineflayer-pathfinder';
import { Vec3 } from 'vec3';

const ACCOUNTS = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
const CFG = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const bots = new Map();
let leaderName = null;

function throttledChat(bot) {
  let last = 0;
  return (msg) => {
    const now = Date.now();
    const wait = Math.max(0, CFG.chatThrottleMs - (now - last));
    setTimeout(() => { try { bot.chat(msg); } catch {} }, wait);
    last = now + wait;
  };
}

function makeBot(acct) {
  const bot = createBot({
    host: CFG.host,
    port: CFG.port,
    username: acct.username,
    auth: acct.auth || 'microsoft',
    version: CFG.version || false,
    profilesFolder: './profiles',
    authTitle: 'MF MultiBot'
  });

  bot.loadPlugin(pathfinder);
  const say = throttledChat(bot);

  bot.once('spawn', () => {
    const mcData = bot.version && bot.registry ? bot.registry : null;
    const move = new Movements(bot, mcData);
    move.canDig = false;
    bot.pathfinder.setMovements(move);
    say(`/me online as ${bot.username}`);
    setInterval(() => {
      try { bot.look(bot.entity.yaw + 0.2, 0, true); } catch {}
    }, 20000 + Math.floor(Math.random() * 5000));
  });

  bot.on('chat', (username, message) => {
    if (!message.startsWith(CFG.commandPrefix)) return;
    if (username !== CFG.owner) return;
    const [cmd, ...args] = message.slice(CFG.commandPrefix.length).trim().split(/\s+/);
    const all = [...bots.values()];

    // individual bot control
    if (cmd === 'bot') {
      const targetName = args.shift();
      const subcmd = args.shift();
      const subargs = args;
      const target = bots.get(targetName);
      if (!target) {
        bot.chat(`/msg ${CFG.owner} No bot named ${targetName}`);
        return;
      }
      switch (subcmd) {
        case 'say':
          target.chat(subargs.join(' '));
          break;
        case 'stop':
          target.pathfinder.setGoal(null);
          target.chat('Stopping.');
          break;
        case 'goto': {
          const [x,y,z] = subargs.map(Number);
          if ([x,y,z].some(n => Number.isNaN(n))) {
            bot.chat(`/msg ${CFG.owner} Usage: .bot ${targetName} goto <x> <y> <z>`);
            return;
          }
          target.pathfinder.setGoal(new goals.GoalBlock(new Vec3(x,y,z), 1));
          target.chat(`Heading to ${x} ${y} ${z}`);
          break;
        }
        case 'dropall':
          dropAll(target);
          break;
        default:
          bot.chat(`/msg ${CFG.owner} Unknown subcommand for ${targetName}: ${subcmd}`);
      }
      return;
    }

    switch (cmd) {
      case 'list':
        bot.chat(`/msg ${CFG.owner} Bots: ${[...bots.keys()].join(', ')}`);
        break;
      case 'say': {
        const msg = args.join(' ');
        if (msg) for (const b of all) throttledChat(b)(msg);
        break;
      }
      case 'here': {
        const me = bot.players[CFG.owner]?.entity;
        if (!me) return;
        leaderName = CFG.owner;
        for (const b of all) {
          b.pathfinder.setGoal(new goals.GoalFollow(me, CFG.followDistance), true);
          throttledChat(b)('On my way!');
        }
        break;
      }
      case 'follow': {
        const target = args[0];
        if (!target) return;
        leaderName = target;
        for (const b of all) {
          const ent = b.players[target]?.entity;
          if (!ent) { throttledChat(b)(`Can't see ${target}.`); continue; }
          b.pathfinder.setGoal(new goals.GoalFollow(ent, CFG.followDistance), true);
          throttledChat(b)(`Following ${target}.`);
        }
        break;
      }
      case 'stop':
        leaderName = null;
        for (const b of all) b.pathfinder.setGoal(null);
        for (const b of all) throttledChat(b)('Stopping.');
        break;
      case 'goto': {
        const [x,y,z] = args.map(Number);
        if ([x,y,z].some(n => Number.isNaN(n))) return;
        for (const b of all) {
          b.pathfinder.setGoal(new goals.GoalBlock(new Vec3(x,y,z), 1));
          throttledChat(b)(`Heading to ${x} ${y} ${z}`);
        }
        break;
      }
      case 'dropall':
        for (const b of all) dropAll(b);
        break;
      default:
        bot.chat(`/msg ${CFG.owner} Unknown command: ${cmd}`);
    }
  });

  bot.on('physicTick', () => {
    if (!leaderName) return;
    const ent = bot.players[leaderName]?.entity;
    if (!ent) return;
    const goal = bot.pathfinder.goal;
    if (!(goal instanceof goals.GoalFollow)) {
      bot.pathfinder.setGoal(new goals.GoalFollow(ent, CFG.followDistance), true);
    }
  });

  bot.on('kicked', (reason) => console.log(`[${bot.username}] kicked:`, reason));
  bot.on('end', () => {
    const delay = CFG.autoReconnectSeconds * 1000 + Math.floor(Math.random()*4000);
    console.log(`[${bot.username}] disconnected, reconnecting in ${delay/1000}s`);
    setTimeout(() => makeBot(acct), delay);
  });
  bot.on('error', (err) => console.log(`[${bot.username}] error:`, err?.message));

  bots.set(acct.username, bot);
}

async function dropAll(bot) {
  try {
    const items = bot.inventory.items();
    for (const item of items) await bot.tossStack(item);
    bot.chat('Dropped inventory.');
  } catch {}
}

(function startAll() {
  let delay = 0;
  for (const acct of ACCOUNTS) {
    setTimeout(() => makeBot(acct), delay);
    delay += CFG.loginStaggerMs + Math.floor(Math.random()*800);
  }
})();
