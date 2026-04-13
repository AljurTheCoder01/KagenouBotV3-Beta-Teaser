# EnkiduBot

A modular Facebook Messenger chatbot system built on top of the KagenouBot framework. Designed to run as an integrated subsystem — sharing the FCA session, config, and database of the parent bot while maintaining its own independent command pipeline.

---

## Features

- **Shared FCA session** — no second login, piggybacks on the parent bot's `api` object
- **TypeScript support** — commands can be `.ts` or `.js`, both work out of the box via `ts-node`
- **Continuous reply** — multi-turn conversations using persistent `replyListeners`, never auto-deleted unless explicitly released
- **Attachment reply** — reply callbacks receive `attachments` so commands can detect images, files, and stickers sent as replies
- **Reaction handler** — register a reaction listener on any sent message; bot responds when a user reacts to it
- **Event commands** — `handleEvent` on any command receives every FCA event (joins, leaves, etc.)
- **Strict command validator** — all required fields must be present or the process exits before login
- **Role system** — `0` user, `1` admin, `2` moderator, `3` developer, `4` vip
- **Non-prefix commands** — commands with `nonPrefix: true` trigger without a prefix
- **Ban system** — checks MongoDB `bannedUsers` collection or JSON fallback
- **Aurora Styler v2** — unicode font styler with inline `**bold**` and `***bold+italic***` markdown, URL-safe (links are never font-converted)
- **Profanity filter** — cleans both incoming and outgoing messages via `bad-words`

---

## Writing Commands

### TypeScript (`.ts`)
```ts

const command: EnkiduBot.Command = {
  config: {
    name:        "example",
    version:     "1.0.0",
    cooldown:    5,
    description: "An example command.",
    author:      "Your Name",
    nonPrefix:   false,
    role:        0,
  },

  async run({ api, event, args }: EnkiduRunContext) {
    api.sendMessage("Hello!", event.threadID, event.messageID);
  },
};

export default command;
```

### JavaScript (`.js`)

```js
"use strict";

const command = {
  config: {
    name: "example",
    version: "1.0.0",
    cooldown: 5,
    description: "An example command.",
    author: "Your Name",
    nonPrefix: false,
    role: 0,
  },

  async run({ api, event, args }) {
    api.sendMessage("Hello!", event.threadID, event.messageID);
  },
};

module.exports = command;
```

Place script commands in `commands/script/` and event commands in `commands/event/`.

---

## Command Config Fields
- I'm strict of commands configuration fields, it requires these fields or else the EnkiduBot will not run.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Unique command name (lowercase) |
| `version` | `string` | ✅ | Semantic version e.g. `1.0.0` |
| `cooldown` | `number` | ✅ | Seconds between uses |
| `description` | `string` | ✅ | Shown in help list |
| `author` | `string` | ✅ | Command author |
| `nonPrefix` | `boolean` | ✅ | Trigger without prefix |
| `role` | `0-4` | ✅ | Minimum role required |
| `aliases` | `string[]` | ❌ | Alternative command names |
| `nsfw` | `boolean` | ❌ | Requires NSFW to be enabled per thread |

Missing any required field → process exits immediately.

---

## Role Levels

| Value | Role |
|---|---|
| `0` | User |
| `1` | Admin |
| `2` | Moderator |
| `3` | Developer |
| `4` | VIP |

Configured in the shared `config.json` under `admins`, `moderators`, `developers`, `vips`.

---

## Continuous Reply

```js
async run({ api, event }) {
  const info = await new Promise(resolve =>
    api.sendMessage("What's your name?", event.threadID, (err, info) => resolve(info))
  );

  global.replyListeners.set(info.messageID, {
    author:   event.senderID,
    keep:     true,
    data:     {},
    callback: async ({ api, event }) => {
      api.sendMessage(`Hello, ${event.body}!`, event.threadID, event.messageID);
      global.replyListeners.delete(info.messageID);
    },
  });
},
```

Set `keep: true` to keep the listener alive across multiple replies. Delete manually when done.

---

## Reaction Handler

```js
async run({ api, event }) {
  const info = await new Promise(resolve =>
    api.sendMessage("React to this!", event.threadID, (err, info) => resolve(info))
  );

  global.reactionData.set(info.messageID, {
    threadID: event.threadID,
    authorID: event.senderID,
    callback: async ({ api, reaction, threadID }) => {
      api.sendMessage(`You reacted: ${reaction}`, threadID);
      global.reactionData.delete(info.messageID);
    },
  });
},
```

---

## Event Commands

```js
const command = {
  config: { name: "welcome", version: "1.0.0", cooldown: 0,
            description: "...", author: "...", nonPrefix: false, role: 0 },

  async handleEvent({ api, event }) {
    if (event.type !== "event" || event.logMessageType !== "log:subscribe") return;
    // handle join
  },

  async run({ api, event }) {},
};

module.exports = command;
```

`handleEvent` receives every FCA event. Filter by `event.type` and `event.logMessageType` as needed.

---

## Aurora Styler v2

```js
const AuroraStyler = require("../../plugins/aurora-styler.js");

AuroraStyler.styleOutput({
  headerText:   "Title here",
  headerSymbol: "⚡",
  headerStyle:  "bold",
  bodyText:     "Supports **bold** and ***bold italic*** inline.\nLinks like https://example.com stay plain.",
  bodyStyle:    "sansSerif",
  footerText:   "***EnkiduBot***",
});
```

**Inline markdown** — works in `headerText`, `bodyText`, and `footerText`:
- `**text**` → bold unicode font
- `***text***` → bold italic unicode font
- URLs are always excluded from font conversion

**Available font styles:** `bold`, `boldItalic`, `italic`, `sansSerif`, `fancy`, `doubleStruck`, `fraktur`, `monospace`, `smallCaps`

---

## Dependencies

Same as the parent project. Ensure the following are installed at the root:

```
ts-node
tsconfig-paths
typescript
fs-extra
chalk
bad-words
mongodb
@dongdev/fca-unofficial
```

---

## Author

**Aljur Pogoy**
