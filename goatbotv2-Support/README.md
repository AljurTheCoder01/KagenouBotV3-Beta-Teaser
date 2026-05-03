# GoatBot V2 Integration Layer

**📌Currently, only 45% of Goatbot v2’s functions and logic are integrated into this bot file. Full integration will be completed soon.**

This folder (`goatbot/`) is a **compatibility bridge** that lets you drop any
[GoatBot V2](https://github.com/ntkhang03/Goat-Bot-V2) command or event script
into your KagenouBot without changing `index.js` beyond a few small additions.

# Goatbotv2 Cmd Signature 
```js
module.exports = {
  config: {
    name: "ping",
    aliases: ["p"],
    version: "1.0.0",
    author: "You",
    countDown: 3, // cooldown seconds
    role: 0, // 0=all, 1=admin, 2=mod, 3=vip, 4=dev
    shortDescription: { en: "Check latency" },
    longDescription: { en: "Pings the bot." },
    category: "info",
    guide: { en: "{pn}ping" },
  },

  onStart: async ({ api, event, args, message, getLang, usersData, threadsData, prefix }) => {
    const start = Date.now();
    const info = await message.reply("🏓 Pong!");
    const ms = Date.now() - start;
    await api.editMessage(`🏓 Pong! (${ms}ms)`, info.messageID);
  },

  // Optional: handle replies to this command's messages
  onReply: async ({ api, event, message, Reply }) => {
    await message.reply("You replied! Reply data: " + JSON.stringify(Reply));
  },

  // Optional: handle reactions to this command's messages  
  onReaction: async ({ api, event, message, Reaction }) => {
    await message.reply(`You reacted with ${event.reaction}!`);
  },
};
```

**To use onReply in your command:**

```js
onStart: async ({ message, ... }) => {
  const info = await message.reply("Choose 1 or 2:");
  message.registerReply(info.messageID, { choice: null, commandName: "myCmd" }, module.exports.onReply);
},

onReply: async ({ event, message, Reply }) => {
  const choice = event.body.trim();
  await message.reply(`You chose: ${choice}`);
},
```

---

## Adding GoatBot Events

Drop event files into `goatbot/events/`. They are auto-loaded.

```js
module.exports = {
  config: {
    name: "my-event",
    eventType: ["message"],  // informational
  },

  onChat: async ({ api, event, message, usersData, threadsData, getLang }) => {
    // Runs on EVERY message — filter by event.type as needed
    if (event.type !== "message") return;
    if (event.body?.toLowerCase() === "hi") {
      await message.reply("Hello! 👋");
    }
  },
};
```

---

## Language / i18n

Place `en.json` (or `vi.json` etc.) in `goatbot/commands/languages/<commandName>/`:

```json
{
  "welcome": "Welcome, %1!",
  "error":   "An error occurred: %1"
}
```

Use inside command:

```js
onStart: async ({ getLang, ... }) => {
  const msg = getLang("welcome", "Aljur");  //  "Welcome, Aljur!"
  await message.reply(msg);
}
```

---

## Role Levels

GoatBot `role` maps to Shadow Garden Bot roles:

| GoatBot role | KagenouBot role |
|:---:|:---|
| 0 | Everyone |
| 1 | Admin |
| 2 | Moderator |
| 3 | VIP |
| 4 | Developer |

---

## Notes

- GoatBot commands are **prefix-aware** — they respect the per-thread prefix set by `global.getPrefix()`.
- GoatBot commands **share the same cooldown map** (`global.userCooldowns`) as native commands.
- GoatBot DB controllers **wrap your existing MongoDB** — no second database needed.
- Files ending in `.eg.js` are **ignored** (matches GoatBot V2 convention).
