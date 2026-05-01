/**
 *   GoatBot command schema:
 *     module.exports = {
 *       config: {
 *         name: string,
 *         aliases: string[],
 *         version: string,
 *         author: string,
 *         countDown: number,   // cooldown in seconds
 *         role: number,   // 0=all 1=admin 2=mod 3=vip 4=dev
 *         shortDescription: { en: "..." },
 *         longDescription:  { en: "..." },
 *         category: string,
 *         guide: { en: "{pn}commandName <args>" },
 *       },
 *       onStart:    async (ctx) => {},
 *       onChat:     async (ctx) => {},
 *       onReply:    async (ctx) => {},
 *       onReaction: async (ctx) => {}, 
 *     }
 */

"use strict";

const fs   = require("fs-extra");
const path = require("path");

/**
 * @param {string} commandsDir
 * @param {Map}    goatCmdMap   - global.GoatBot.commands
 * @returns {number} count cmds goatbot registered
 */
function load(commandsDir, goatCmdMap) {
  if (!fs.existsSync(commandsDir)) {
    global.log.warn(`[GoatBot:CommandLoader] commands/ dir not found: ${commandsDir}`);
    return 0;
  }

  const files = fs
    .readdirSync(commandsDir)
    .filter(f => (f.endsWith(".js") || f.endsWith(".ts")) && !f.endsWith(".eg.js"));

  let count = 0;

  for (const file of files) {
    const filePath = path.join(commandsDir, file);
    let mod;

    try {
      mod = require(filePath);
    } catch (err) {
      continue;
    }

    const cmd = mod.default || mod;
    const isGoatBot = _isGoatBotCommand(cmd);
    const isNative  = _isNativeCommand(cmd);

    if (!isGoatBot && !isNative) continue;
    if (isNative && !isGoatBot) continue; 
    const name = (cmd.config?.name || cmd.name || "").toLowerCase();
    if (!name) {
      global.log.warn(`[GoatBot:CommandLoader] Skipped '${file}': no name found`);
      continue;
    }

    try {
      goatCmdMap.set(name, cmd);
      if (Array.isArray(cmd.config?.aliases)) {
        for (const alias of cmd.config.aliases) {
          goatCmdMap.set(alias.toLowerCase(), cmd);
        }
      }
      const wrapped = _wrapAsNative(cmd);
      global.commands.set(name, wrapped);
      if (Array.isArray(cmd.config?.aliases)) {
        for (const alias of cmd.config.aliases) {
          global.commands.set(alias.toLowerCase(), wrapped);
        }
      }
      if (typeof cmd.onChat === "function") {
        global.GoatBot.eventCommands.push(cmd);
      }

      count++;
      global.log.info(`[GoatBot:CommandLoader] Registered GoatBot command: ${name} (${file})`);
    } catch (err) {
      global.log.error(`[GoatBot:CommandLoader] Failed to register '${file}': ${err.message}`);
    }
  }

  return count;
}
function _isGoatBotCommand(cmd) {
  if (!cmd || typeof cmd !== "object") return false;
  return typeof cmd.onStart === "function";
}
function _isNativeCommand(cmd) {
  if (!cmd || typeof cmd !== "object") return false;
  return typeof cmd.run === "function" || typeof cmd.execute === "function";
}
/**
 * @param {Object} goatCmd
 * @returns {Object} compatible command object
 */
function _wrapAsNative(goatCmd) {
  const cmdName = goatCmd.config.name;

  return {
    config: {
      name:       cmdName,
      aliases:    goatCmd.config.aliases   || [],
      role:       goatCmd.config.role      ?? 0,
      cooldown:   goatCmd.config.countDown ?? 3,
      category:   goatCmd.config.category  || "goatbot",
      nsfw:       goatCmd.config.nsfw      || false,
      nonPrefix:  goatCmd.config.nonPrefix || false,
      _isGoatCmd: true,
    },
    run: async ({ api, event, args, prefix, db, usersData: _u, globalData: _g }) => {
      const { buildMessageHelper, buildGetLang } = require("./messageWrapper");
      const message = buildMessageHelper(api, event);
      const getLang = buildGetLang(cmdName);

      await goatCmd.onStart({
        api,
        event,
        args,
        message,
        getLang,
        prefix:        prefix || global.getPrefix(event.threadID),
        usersData:     global.GoatBot.usersData,
        threadsData:   global.GoatBot.threadsData,
        dashBoardData: global.GoatBot.dashBoardData,
        commandName:   cmdName,
        role:          goatCmd.config.role ?? 0,
        envCommands:   global.GoatBot.commands,
        envEvents:     global.GoatBot.eventCommands,
      });
    },
    onReply:     goatCmd.onReply     || null,
    onReaction:  goatCmd.onReaction  || null,
    onChat:      goatCmd.onChat      || null,
    handleEvent: goatCmd.handleEvent || null,
  };
}

module.exports = { load };
