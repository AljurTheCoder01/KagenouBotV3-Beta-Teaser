/*
*@Notice will have new Chatbot system.
*
*/
"use strict";

require("tsconfig-paths").register();
require("ts-node").register();
require("./CORE/global.ts");
require("./CORE/global.d.ts");

const fs = require("fs-extra");
const path = require("path");
const AuroraStyler = require("./plugins/aurora-styler.js");

const ROOT = path.join(__dirname, "..");
const configFile = path.join(ROOT, "config.json");
const bannedUsersFile = path.join(ROOT, "database", "bannedUsers.json");
const scriptDir = path.join(__dirname, "commands", "script");
const eventDir = path.join(__dirname, "commands", "event");

try {
  const cfg = JSON.parse(fs.readFileSync(configFile, "utf8"));
  global.config = {
    admins:       cfg.admins       || [],
    moderators:   cfg.moderators   || [],
    developers:   cfg.developers   || [],
    vips:         cfg.vips         || [],
    Prefix:       Array.isArray(cfg.Prefix) && cfg.Prefix.length ? cfg.Prefix : ["/"],
    botName:      cfg.botName      || "EnkiduBot",
    mongoUri:     cfg.mongoUri     || null,
    replyTimeout: cfg.replyTimeout || 600,
    ...cfg,
  };
  global.log.success("[ENKIDU:CONFIG] Loaded.");
} catch (e) {
  global.log.error("[ENKIDU:CONFIG] Failed: " + e.message);
}

const REQUIRED_FIELDS = ["name", "version", "cooldown", "description", "author", "nonPrefix", "role"];

function validateCommand(config, file) {
  for (const field of REQUIRED_FIELDS) {
    if (config[field] === undefined || config[field] === null) {
      global.log.error(`[ENKIDU:VALIDATOR] '${file}' missing field: '${field}'. Exiting.`);
      process.exit(1);
    }
  }
  if (typeof config.role !== "number" || config.role < 0 || config.role > 4) {
    global.log.error(`[ENKIDU:VALIDATOR] '${file}' invalid role: '${config.role}'. Exiting.`);
    process.exit(1);
  }
}

function loadCommandsFromDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".js") || f.endsWith(".ts"));
  for (const file of files) {
    try {
      const filePath = path.join(dir, file);
      delete require.cache[require.resolve(filePath)];
      const mod     = require(filePath);
      const command = mod.default || mod;
      if (!command || !command.config) { global.log.warn(`[ENKIDU:LOADER] '${file}' no config, skipped.`); continue; }
      validateCommand(command.config, file);
      const name = command.config.name.toLowerCase();
      global.commands.set(name, command);
      if (Array.isArray(command.config.aliases)) {
        command.config.aliases.forEach(a => global.commands.set(a.toLowerCase(), command));
      }
      if (command.config.nonPrefix) global.nonPrefixCommands.set(name, command);
      if (typeof command.handleEvent === "function") global.eventCommands.push(command);
    } catch (err) {
      global.log.error(`[ENKIDU:LOADER] '${file}': ${err.message}`);
    }
  }
}

function loadCommands() {
  global.commands.clear();
  global.nonPrefixCommands.clear();
  global.eventCommands.length = 0;
  loadCommandsFromDir(scriptDir);
  loadCommandsFromDir(eventDir);
  global.log.success(`[ENKIDU:LOADER] ${global.commands.size} commands | ${global.nonPrefixCommands.size} non-prefix | ${global.eventCommands.length} event handlers.`);
}

global.reloadCommands = loadCommands;

let bannedCache = {};
function loadBannedUsers() {
  try { bannedCache = JSON.parse(fs.readFileSync(bannedUsersFile, "utf8")); } catch { bannedCache = {}; }
}

async function isUserBanned(senderID) {
  if (global.db) return await global.db.db("bannedUsers").findOne({ userId: String(senderID) });
  return bannedCache[String(senderID)] || null;
}

function setCooldown(userID, commandName, seconds) {
  global.userCooldowns.set(`${userID}:${commandName}`, Date.now() + seconds * 1000);
}

function checkCooldown(userID, commandName) {
  const expiry = global.userCooldowns.get(`${userID}:${commandName}`);
  if (expiry && Date.now() < expiry) return Math.ceil((expiry - Date.now()) / 1000);
  return 0;
}

const sendMessage = (api, opts) => new Promise((resolve, reject) => {
  const { threadID, message, messageID, senderID, attachment, onReply, replyData, keepReply = false } = opts;
  if (!threadID) return reject(new Error("threadID required"));
  if (!message && !attachment) return resolve(null);
  let finalMessage = message || "";
  if (global.profanityFilter && global.profanityEnabled && finalMessage) {
    try { finalMessage = global.profanityFilter.clean(finalMessage); } catch (_) {}
  }
  api.sendMessage({ body: finalMessage, attachment }, threadID, (err, info) => {
    if (err) return reject(err);
    if (typeof onReply === "function" && info?.messageID) {
      global.replyListeners.set(info.messageID, {
        callback: onReply,
        author:   senderID,
        data:     replyData || {},
        keep:     keepReply,
      });
    }
    resolve(info);
  }, messageID || null);
});

async function handleReply(api, event) {
  const repliedToID = event.messageReply?.messageID;
  if (!repliedToID) return false;
  const listener = global.replyListeners.get(repliedToID);
  if (!listener) return false;
  if (listener.author && event.senderID !== listener.author) {
    api.sendMessage("Only the original sender can continue this.", event.threadID, event.messageID);
    return true;
  }
  try {
    await listener.callback({ api, event, attachments: event.attachments || [], data: listener.data || {} });
  } catch (err) {
    global.log.error("[ENKIDU:REPLY] " + err.message);
    api.sendMessage(`Reply error: ${err.message}`, event.threadID, event.messageID);
  }
  if (!listener.keep) global.replyListeners.delete(repliedToID);
  return true;
}

async function handleReaction(api, event) {
  const { messageID, reaction, threadID, senderID } = event;
  const entry = global.reactionData.get(messageID);
  if (!entry || typeof entry.callback !== "function") return;
  if (entry.authorID && entry.authorID !== senderID) return;
  try {
    await entry.callback({ api, event, reaction, threadID, messageID, senderID });
  } catch (err) {
    global.log.error("[ENKIDU:REACTION] " + err.message);
  }
}

async function handleEvent(api, event) {
  for (const cmd of global.eventCommands) {
    try {
      if (typeof cmd.handleEvent === "function") await cmd.handleEvent({ api, event, db: global.db });
    } catch (err) {
      global.log.error(`[ENKIDU:EVENT] ${cmd.config?.name}: ${err.message}`);
    }
  }
}

async function handleMessage(api, event) {
  const { threadID, senderID, messageID, attachments } = event;
  let body = (event.body || "").trim();

  if (global.profanityFilter && global.profanityEnabled && body) {
    try {
      const cleaned = global.profanityFilter.clean(body);
      if (cleaned !== body) {
        global.log.warn(`[ENKIDU:PROFANITY] ${senderID}: "${body}" -> "${cleaned}"`);
        if (global.getUserRole(senderID) < 2) return;
        event.body = cleaned;
        body = cleaned;
      }
    } catch (_) {}
  }

  const prefix = global.getPrefix(threadID);
  const words  = body.split(/ +/);
  let commandName = "";
  let args        = [];
  let command     = null;
  let isAttempt   = false;

  if (body.startsWith(prefix)) {
    commandName = body.slice(prefix.length).split(/ +/)[0].toLowerCase();
    args        = body.slice(prefix.length).split(/ +/).slice(1);
    command     = global.commands.get(commandName);
    isAttempt   = true;
  }

  if (!command) {
    const candidate = words[0]?.toLowerCase() || "";
    command = global.nonPrefixCommands.get(candidate);
    if (command) { commandName = candidate; args = words.slice(1); isAttempt = true; }
  }

  if (!isAttempt) return;

  const bannedEntry = await isUserBanned(senderID);
  if (bannedEntry) {
    return api.sendMessage(
      AuroraStyler.styleOutput({
        headerText: "Access Denied", headerSymbol: "🚫", headerStyle: "bold",
        bodyText:   `You are banned from **EnkiduBot**.\n\n📌 Reason: ${bannedEntry.reason || "No reason provided"}`,
        bodyStyle:  "sansSerif", footerText: `Your UID: ${senderID}`,
      }),
      threadID, messageID
    );
  }

  if (!command) {
    return api.sendMessage(
      AuroraStyler.styleOutput({
        headerText: "Unknown Command", headerSymbol: "🔍", headerStyle: "bold",
        bodyText:   `That command doesn't exist.\nTry **${prefix}help** to see all commands.`,
        bodyStyle:  "sansSerif", footerText: `${global.config.botName}`,
      }),
      threadID, messageID
    );
  }

  const userRole = global.getUserRole(senderID);

  if (global.maintenanceMode && userRole === 0) {
    return api.sendMessage(
      AuroraStyler.styleOutput({
        headerText: "Under Maintenance", headerSymbol: "🔧",
        bodyText: "Bot is under maintenance. Please try again later.",
        bodyStyle: "sansSerif", footerText: "",
      }),
      threadID, messageID
    );
  }

  if (command.config.nsfw && !global.nsfwEnabled.get(threadID)) {
    return api.sendMessage("🚫 NSFW commands are disabled in this thread.", threadID, messageID);
  }

  const requiredRole = command.config.role ?? 0;
  if (userRole < requiredRole) {
    return api.sendMessage(
      AuroraStyler.styleOutput({
        headerText: "Permission Denied", headerSymbol: "🛡️",
        bodyText: "You don't have permission to use this command.",
        bodyStyle: "sansSerif", footerText: "",
      }),
      threadID, messageID
    );
  }

  const disabledList = global.disabledCommands.get("disabled") || [];
  if (disabledList.includes(commandName)) {
    return api.sendMessage(`⚙️ '${commandName}' is currently under maintenance.`, threadID, messageID);
  }

  const remaining = checkCooldown(senderID, commandName);
  if (remaining > 0) {
    return api.sendMessage(`⏳ Wait **${remaining}s** before using '${commandName}' again.`, threadID, messageID);
  }
  setCooldown(senderID, commandName, command.config.cooldown ?? 3);

  try {
    global.trackUsage(commandName);
    await command.run({
      api, event, args,
      attachments: attachments || [],
      prefix, db: global.db,
      commands:   global.commands,
      usersData:  global.usersData,
      globalData: global.globalData,
      admins:     global.config.admins,
    });
    if (global.db && global.usersData.has(senderID)) {
      global.db.db("users").updateOne(
        { userId: senderID },
        { $set: { userId: senderID, data: global.usersData.get(senderID) } },
        { upsert: true }
      ).catch(() => {});
    }
  } catch (err) {
    global.log.error(`[ENKIDU:CMD:${commandName}] ${err.message}`);
    api.sendMessage(`❌ Error in '${commandName}': ${err.message}`, threadID, messageID);
  }
}

async function onEvent(api, event) {
  try {
    if (global.db) {
      const banned = await global.db.db("bannedThreads").findOne({ threadID: String(event.threadID) });
      if (banned) return;
    }

    await handleEvent(api, event);

    const type = event.type;

    if (type === "message_reply" && event.messageReply) {
      const handled = await handleReply(api, event);
      if (handled) return;
    }

    if (type === "message" || type === "message_reply") {
      event.attachments = event.attachments || [];
      await handleMessage(api, event);
    }

    if (type === "message_reaction") {
      await handleReaction(api, event);
    }

    if (type === "event" && event.logMessageType === "log:subscribe") {
      const added    = event.logMessageData?.addedParticipants || [];
      const botAdded = added.some(u => u.userFbId === api.getCurrentUserID());
      if (botAdded) {
        const tid = event.threadID;
        if (global.db) {
          try {
            const info = await api.getThreadInfo(tid);
            global.db.db("threads").updateOne(
              { threadID: tid },
              { $set: { threadID: tid, name: info.name || `Unnamed (${tid})` } },
              { upsert: true }
            ).catch(() => {});
          } catch (_) {}
        }
        api.sendMessage(
          AuroraStyler.styleOutput({
            headerText: `Hello! I'm ${global.config.botName} 👋`, headerSymbol: "🌟", headerStyle: "bold",
            bodyText:   `Thanks for inviting me!\nType **${global.getPrefix(tid)}help** to see what I can do.`,
            bodyStyle:  "sansSerif", footerText: `${global.config.botName}`,
          }),
          tid
        );
        try { await api.changeNickname(global.config.botName, tid, api.getCurrentUserID()); } catch (_) {}
      }
    }
  } catch (err) {
    global.log.error("[ENKIDU:EVENT] " + err.message);
  }
}

function init(api) {
  loadBannedUsers();
  loadCommands();
  global.botApi = api;
  global.log.success("[ENKIDU] Initialized and ready.");
}

module.exports = { init, onEvent };
