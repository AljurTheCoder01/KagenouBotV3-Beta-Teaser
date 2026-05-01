/**
 * @Description GoatBot V2 Integration.
 * @Collaboration with CodeVerse Community Ltd.
 *
 * This module bridges GoatBot V2's command/event schema into
 * the existing KagenouBot (index.js) infrastructure.
 * 
 * GoatBot command format supported:
 *   module.exports = {
 *     config: { name, aliases, version, author, countDown, role, shortDescription, longDescription, category, guide },
 *     onStart: async ({ api, event, args, message, usersData, threadsData, ... }) => {},
 *     onChat:  async ({ api, event, message, ... }) => {},
 *     onReply: async ({ api, event, message, Reply, ... }) => {},
 *     onReaction: async ({ api, event, message, Reaction, ... }) => {},
 *   }
 * 
 * @author Aljurx Pogoy
 * @JsDoc Annotations by Aljurx and Francis Loyd M. Raval
 */

"use strict";

const path = require("path");
const fs   = require("fs-extra");

const GoatCommandLoader = require("./handlers/commandLoader");
const GoatEventLoader = require("./handlers/eventLoader");
const GoatMessageWrapper = require("./handlers/messageWrapper");
const GoatDB = require("./database/controllers/index");
const GoatLang = require("./languages/index");

global.GoatBot = {
  commands: new Map(),   // name → command module
  eventCommands:  [],          // modules with onChat / handleEvent
  replyListeners: new Map(),   // msgID → { callback, data }
  reactListeners: new Map(),   // msgID → { callback, data }
  usersData: null,        // GoatDB users controller
  threadsData: null,        // GoatDB threads controller
  dashBoardData: null,        // GoatDB dashboard controller
  lang: null,        // Language helper
};

/**
 * Bootstrap the GoatBot integration.
 * Call this once during startBot() in index.js.
 * @param {Object} api - The fca-unofficial API instance (optional, set later)
 */
async function initGoatBot(api = null) {
  global.log.info("[GoatBot] Initializing GoatBot V2 integration...");
  global.GoatBot.usersData = new GoatDB.UsersData();
  global.GoatBot.threadsData = new GoatDB.ThreadsData();
  global.GoatBot.dashBoardData = new GoatDB.DashBoardData();
  global.GoatBot.lang = GoatLang.init();
  const mainCommandsDir = path.join(__dirname, "..", "commands");
  const cmdCount = GoatCommandLoader.load(mainCommandsDir, global.GoatBot.commands);
  global.log.info(`[GoatBot] Detected ${cmdCount} GoatBot V2 command(s) in commands/.`);
  const evtCount = GoatEventLoader.load(
    path.join(__dirname, "events"),
    global.GoatBot.eventCommands
  );
  global.log.info(`[GoatBot] Loaded ${evtCount} GoatBot event handler(s).`);

  global.log.success("[GoatBot] Integration layer ready.");
  return true;
}

/**
 * Main dispatcher — called from index.js handleMessage.
 * Returns true if GoatBot handled the event, false to fall through.
 *
 * @param {Object} api
 * @param {Object} event
 * @returns {Promise<boolean>}
 */
async function dispatchGoatMessage(api, event) {
  return GoatMessageWrapper.dispatch(api, event);
}

/**
 * Runs all GoatBot onChat handlers.
 * @param {Object} api
 * @param {Object} event
 */
async function dispatchGoatEvent(api, event) {
  for (const cmd of global.GoatBot.eventCommands) {
    try {
      if (typeof cmd.onChat === "function") {
        const message = GoatMessageWrapper.buildMessageHelper(api, event);
        await cmd.onChat({ api, event, message,
          usersData: global.GoatBot.usersData,
          threadsData: global.GoatBot.threadsData,
          args: (event.body || "").trim().split(/ +/),
          getLang: global.GoatBot.lang.get,
        });
      }
    } catch (err) {
      global.log.error(`[GoatBot:onChat] ${cmd.config?.name || "unknown"}: ${err.message}`);
    }
  }
}

/**
 * @param {Object} api
 * @param {Object} event
 * @returns {Promise<boolean>} true if handled
 */
async function dispatchGoatReply(api, event) {
  const repliedToID = event.messageReply?.messageID;
  if (!repliedToID) return false;
  const listener = global.GoatBot.replyListeners.get(repliedToID);
  if (!listener) return false;

  try {
    const message = GoatMessageWrapper.buildMessageHelper(api, event);
    await listener.callback({
      api, event, message,
      Reply: listener.data,
      args: (event.body || "").trim().split(/ +/),
      usersData: global.GoatBot.usersData,
      threadsData: global.GoatBot.threadsData,
      getLang: global.GoatBot.lang.get,
    });
    global.GoatBot.replyListeners.delete(repliedToID);
    return true;
  } catch (err) {
    global.log.error(`[GoatBot:onReply] ${err.message}`);
    return false;
  }
}

/**
 * @param {Object} api
 * @param {Object} event
 * @returns {Promise<boolean>} true if handled
 */
async function dispatchGoatReaction(api, event) {
  const listener = global.GoatBot.reactListeners.get(event.messageID);
  if (!listener) return false;

  try {
    const message = GoatMessageWrapper.buildMessageHelper(api, event);
    await listener.callback({
      api, event, message,
      Reaction: listener.data,
      usersData: global.GoatBot.usersData,
      threadsData: global.GoatBot.threadsData,
      getLang: global.GoatBot.lang.get,
    });
    global.GoatBot.reactListeners.delete(event.messageID);
    return true;
  } catch (err) {
    global.log.error(`[GoatBot:onReaction] ${err.message}`);
    return false;
  }
}

module.exports = {
  initGoatBot,
  dispatchGoatMessage,
  dispatchGoatEvent,
  dispatchGoatReply,
  dispatchGoatReaction,
};
