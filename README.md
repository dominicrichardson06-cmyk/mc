# Mineflayer Multi-Bot Controller

This project lets you run and control multiple Minecraft bots on a server using [mineflayer](https://github.com/PrismarineJS/mineflayer).

## Features
- Microsoft-auth login for multiple accounts
- Group commands (all bots act together)
- Individual bot control
- Auto-reconnect with random delay (anti-anti-cheat friendly)
- Basic pathfinding and follow
- Drop inventory on command

## Setup

### 1. Install dependencies
```bash
npm init -y
npm i mineflayer mineflayer-pathfinder vec3
```

### 2. Configure accounts and server
Edit `accounts.json` with your Microsoft account emails:
```json
[
  { "username": "account1@example.com", "auth": "microsoft" },
  { "username": "account2@example.com", "auth": "microsoft" }
]
```
Edit `config.json` with your server info and owner name.

### 3. Run
```bash
node index.mjs
```
The first time you run it, you’ll see Microsoft device login codes in the console. Enter each code in the browser to authenticate.

### 4. Control the bots (in-game chat)
As the `owner` account, type commands in chat:

**Group commands:**
- `.list` → list connected bots
- `.here` → all bots follow you
- `.follow <player>` → follow a named player
- `.stop` → stop following/moving
- `.goto <x> <y> <z>` → walk all bots to coordinates
- `.say <message>` → all bots speak
- `.dropall` → all bots drop inventory

**Individual bot commands:**
- `.bot <BotName> say hello`
- `.bot <BotName> goto 100 64 200`
- `.bot <BotName> stop`
- `.bot <BotName> dropall`

## Notes
- Only the `owner` username in `config.json` can command bots.
- For whitelisted servers, your friend must whitelist the bots’ **gamertags** (not emails).
- If the server limits “connections per IP”, you may need proxies.

Enjoy controlling your squad!
