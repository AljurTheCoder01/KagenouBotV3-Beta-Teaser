"use strict";

require("tsconfig-paths").register();
require("ts-node").register();
require("./CORE/global.ts");
require("./CORE/global.d.ts")
const fs = require("fs-extra");
const path = require("path");
const AuroraStyler = require("./plugins/aurora-styler.js");

const ROOT = path.join(__dirname, "..");
const configFile = path.join(ROOT, "config.json");
const scriptsDir = path.join(__dirname, "cmdFile", "scripts");

try {
  const cfg = JSON.parse(fs.readFileSync(configFile, "utf8"));
  global.config = {
    admins: cfg.admins       || [],
    moderators: cfg.moderators   || [],
    developers: cfg.developers   || [],
    vips: cfg.vips         || [],
    Prefix: Array.isArray(cfg.EnkiduPrefix) && cfg.Prefix.length ? cfg.Prefix : ["/"],
    botName: cfg.botName      || "EnkiduBot",
    mongoUri: cfg.mongoUri     || null,
    EnkiduPrefix: cfg.EnkiduPrefix || "/",
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

function loadCommands() {
  global.commands.clear();
  global.nonPrefixCommands.clear();
  if (!fs.existsSync(scriptsDir)) return;
  const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith(".js") || f.endsWith(".ts"));
  for (const file of files) {
    try {
      const filePath = path.join(scriptsDir, file);
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
    } catch (err) {
      global.log.error(`[ENKIDU:LOADER] '${file}': ${err.message}`);
    }
  }
  global.log.success(`[ENKIDU:LOADER] ${global.commands.size} commands | ${global.nonPrefixCommands.size} non-prefix.`);
}

global.reloadCommands = loadCommands;

async function isUserBanned(senderID) {
  if (!global.db) return null;
  return await global.db.db("bannedUsers").findOne({ userId: String(senderID) });
}

function setCooldown(userID, commandName, seconds) {
  global.userCooldowns.set(`${userID}:${commandName}`, Date.now() + seconds * 1000);
}

function checkCooldown(userID, commandName) {
  const expiry = global.userCooldowns.get(`${userID}:${commandName}`);
  if (expiry && Date.now() < expiry) return Math.ceil((expiry - Date.now()) / 1000);
  return 0;
}

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
        bodyText:   `You are banned from using this bot.\n\n📌 Reason: ${bannedEntry.reason || "No reason provided"}`,
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
        bodyStyle:  "sansSerif", 
        footerText: `${global.config.botName}`,
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
  } catch (err) {
    global.log.error("[ENKIDU] " + err.message);
  }
}

function init(api) {
  loadCommands();
  global.botApi = api;
  global.log.success("[ENKIDU] Initialized and ready.");
}

module.exports = { init, onEvent };

