"use strict";

const GoatLang = require("../languages/index");

/**
 * @param {Object} api   - fca-unofficial api
 * @param {Object} event - current event
 * @returns {Object}
 */
function buildMessageHelper(api, event) {
  const { threadID, messageID, senderID } = event;

  /**
   * @param {Object}   replyData
   * @param {Function} callback   - onReply handler
   */
  const setReplyListener = (replyData, callback, commandName) => {
    // We piggy-back on Kagenou.replies (native) so existing routing works
    // AND on GoatBot.replyListeners for GoatBot-style context
  };

  return {
    reply: (body, callback) => {
      return new Promise((resolve, reject) => {
        api.sendMessage(
          typeof body === "string" ? { body } : body,
          threadID,
          (err, info) => {
            if (err) return reject(err);
            if (typeof callback === "function") callback(info);
            resolve(info);
          },
          messageID
        );
      });
    },

    send: (body, targetThread, callback) => {
      const tid = targetThread || threadID;
      return new Promise((resolve, reject) => {
        api.sendMessage(
          typeof body === "string" ? { body } : body,
          tid,
          (err, info) => {
            if (err) return reject(err);
            if (typeof callback === "function") callback(info);
            resolve(info);
          }
        );
      });
    },
    addReplyListener: (replyData, callback, ttl = 300) => {
    },
    registerReply: (sentMessageID, replyData, callback) => {
      global.GoatBot.replyListeners.set(sentMessageID, {
        callback,
        data: replyData,
        expiresAt: Date.now() + 300_000,
      });
      global.Kagenou.replies[sentMessageID] = {
        callback: async (replyEvent) => {
          const msg2 = buildMessageHelper(api, replyEvent);
          const getLang2 = buildGetLang(replyData.commandName || "");
          await callback({
            api,
            event: replyEvent,
            message: msg2,
            Reply: replyData,
            args: (replyEvent.body || "").trim().split(/ +/),
            usersData: global.GoatBot.usersData,
            threadsData: global.GoatBot.threadsData,
            getLang: getLang2,
          });
        },
        author: senderID,
      };
    },
    reaction: (emoji, targetMsgID) => {
      return api.setMessageReaction(emoji, targetMsgID || messageID, () => {}, true);
    },
    unsend: (targetMsgID) => {
      return api.unsendMessage(targetMsgID || messageID);
    },
    add: (userID, targetThread) => {
      return api.addUserToGroup(userID, targetThread || threadID);
    },
    kick: (userID, targetThread) => {
      return api.removeUserFromGroup(userID, targetThread || threadID);
    },
    setTitle: (title, targetThread) => {
      return api.setTitle(title, targetThread || threadID);
    },
    threadID,
    messageID,
    senderID,
  };
}

/**
 * @param {string} commandName
 * @returns {Function} getLang(key, ...args)
 */
function buildGetLang(commandName) {
  return (key, ...args) => GoatLang.get(commandName, key, ...args);
}

/**
 * @param {Object} api
 * @param {Object} event
 * @returns {Promise<boolean>}
 */
async function dispatch(api, event) {
  const { threadID, senderID, body, messageID } = event;
  if (!body) return false;

  const message = body.trim();
  const prefix  = global.getPrefix(threadID);

  if (!message.startsWith(prefix)) return false;

  const parts = message.slice(prefix.length).trim().split(/ +/);
  const cmdName = parts[0]?.toLowerCase();
  const args    = parts.slice(1);

  const cmd = global.GoatBot.commands.get(cmdName);
  if (!cmd || typeof cmd.onStart !== "function") return false;
  const userRole    = _getUserRole(senderID);
  const commandRole = cmd.config?.role ?? 0;
  if (userRole < commandRole) {
    api.sendMessage("🛡️ You don't have permission to use this command.", threadID, messageID);
    return true;
  }
  const cooldown = cmd.config?.countDown ?? 3;
  const cdKey    = `goat:${senderID}:${cmdName}`;
  const cdExpiry = global.userCooldowns.get(cdKey);
  if (cdExpiry && Date.now() < cdExpiry) {
    const remaining = Math.ceil((cdExpiry - Date.now()) / 1000);
    api.sendMessage(`⏳ Please wait ${remaining}s before using '${cmdName}' again.`, threadID, messageID);
    return true;
  }
  global.userCooldowns.set(cdKey, Date.now() + cooldown * 1000);

  try {
    global.trackUsage(cmdName);
    const msgHelper = buildMessageHelper(api, event);
    const getLang   = buildGetLang(cmdName);

    await cmd.onStart({
      api,
      event,
      args,
      message: msgHelper,
      getLang,
      prefix,
      usersData:     global.GoatBot.usersData,
      threadsData:   global.GoatBot.threadsData,
      dashBoardData: global.GoatBot.dashBoardData,
      commandName:   cmdName,
      role:          userRole,
      envCommands:   global.GoatBot.commands,
      envEvents:     global.GoatBot.eventCommands,
    });
    return true;
  } catch (err) {
    global.log.error(`[GoatBot:dispatch] Command '${cmdName}' error: ${err.message}`);
    api.sendMessage(`❌ Error in GoatBot command '${cmdName}': ${err.message}`, threadID, messageID);
    return true;
  }
}
function _getUserRole(uid) {
  uid = String(uid);
  if (!global.config) return 0;
  const devs = (global.config.developers || []).map(String);
  const mods = (global.config.moderators || []).map(String);
  const adms = (global.config.admins     || []).map(String);
  const vips = (global.config.vips       || []).map(String);
  if (devs.includes(uid)) return 4;
  if (vips.includes(uid)) return 3;
  if (mods.includes(uid)) return 2;
  if (adms.includes(uid)) return 1;
  return 0;
}

module.exports = { dispatch, buildMessageHelper, buildGetLang };
