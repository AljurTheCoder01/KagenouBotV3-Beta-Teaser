/**
 * @file goatbot/handlers/eventLoader.js
 * @description Loads GoatBot V2 event scripts (scripts/events equivalent).
 * @author Aljurx Pogoy 
 * GoatBot event schema:
 *   module.exports = {
 *     config: { name, eventType: ["message", "message_reply", ...] },
 *     onStart: async (ctx) => {},
 *     onChat:  async (ctx) => {},
 *   }
 */

"use strict";

const fs   = require("fs-extra");
const path = require("path");

/**
 * Load all GoatBot event files from a directory.
 * @param {string} dir - Absolute path to the events directory
 * @param {Array}  eventArray - global.GoatBot.eventCommands
 * @returns {number} count of loaded events
 */
function load(dir, eventArray) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    global.log.warn(`[GoatBot:EventLoader] Created empty events dir: ${dir}`);
    return 0;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".js") && !f.endsWith(".eg.js"));
  let count = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      delete require.cache[require.resolve(filePath)];
      const mod = require(filePath);
      const evt = mod.default || mod;

      if (!evt || !evt.config || !evt.config.name) {
        global.log.warn(`[GoatBot:EventLoader] Skipped '${file}': missing config.name`);
        continue;
      }
      eventArray.push(evt);
      if (typeof evt.onChat === "function" || typeof evt.handleEvent === "function") {
        const bridged = {
          config: evt.config,
          handleEvent: async ({ api, event, db }) => {
            const { buildMessageHelper, buildGetLang } = require("./messageWrapper");
            const message = buildMessageHelper(api, event);
            const getLang = buildGetLang(evt.config.name);
            const ctx = {
              api, event, message, getLang,
              usersData: global.GoatBot.usersData,
              threadsData: global.GoatBot.threadsData,
              args: (event.body || "").trim().split(/ +/),
            };
            if (typeof evt.onChat === "function") await evt.onChat(ctx);
            if (typeof evt.handleEvent === "function") await evt.handleEvent(ctx);
          },
        };
        global.eventCommands.push(bridged);
      }

      count++;
      global.log.info(`[GoatBot:EventLoader] Loaded event: ${evt.config.name}`);
    } catch (err) {
      global.log.error(`[GoatBot:EventLoader] Failed to load '${file}': ${err.message}`);
    }
  }

  return count;
}

module.exports = { load };
