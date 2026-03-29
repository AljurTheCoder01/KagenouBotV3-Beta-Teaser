const AuroraBetaStyler = require("@aurora/styler");

const threadStates = {};

module.exports = {
  config: {
    name: "chat-off",
    description: "Disable chat for members. Non-authorized users will be kicked if they chat.",
    usage: "chat-off [on|off]",
    category: "System ⚡",
    role: 2,
    nonPrefix: false,
  },

  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;

    const styledMessage = (header, body, symbol) =>
      AuroraBetaStyler.styleOutput({
        headerText: header,
        headerSymbol: symbol,
        headerStyle: "bold",
        bodyText: body,
        bodyStyle: "bold",
        footerText: "Developed by: **Aljur Pogoy**",
      });

    const getUserRole = (uid) => {
      uid = String(uid);
      if (!global.config) return 0;

      const developers = (global.config.developers || []).map(String);
      const admins = (global.config.admins || []).map(String);
      const moderators = (global.config.moderators || []).map(String);
      const vips = (global.config.vips || []).map(String);

      if (developers.includes(uid)) return 4;
      if (admins.includes(uid)) return 3;
      if (moderators.includes(uid)) return 2;
      if (vips.includes(uid)) return 1;
      return 0;
    };

    // Only mods
    if (getUserRole(senderID) < 2) {
      return api.sendMessage(
        styledMessage("Chat-Off", "You don't have permission to use this command.", "❌"),
        threadID,
        messageID
      );
    }

    const action = args[0]?.toLowerCase();

    if (action === "on") {
      threadStates[threadID] = true;
      await api.sendMessage(
        styledMessage("Chat-Off", "Chat is now disabled for members.", "🚫"),
        threadID,
        messageID
      );
    } else if (action === "off") {
      threadStates[threadID] = false;
      await api.sendMessage(
        styledMessage("Chat-Off", "Chat is now enabled for everyone.", "✅"),
        threadID,
        messageID
      );
    } else {
      await api.sendMessage(
        styledMessage("Chat-Off", "Usage: /chat-off [on|off]", "⚠️"),
        threadID,
        messageID
      );
    }
  },

  handleEvent: async ({ api, event }) => {
    const { threadID, senderID, body } = event;
    if (!body || !threadStates[threadID]) return;

    const getUserRole = (uid) => {
      uid = String(uid);
      if (!global.config) return 0;

      const developers = (global.config.developers || []).map(String);
      const admins = (global.config.admins || []).map(String);
      const moderators = (global.config.moderators || []).map(String);
      const vips = (global.config.vips || []).map(String);

      if (developers.includes(uid)) return 4;
      if (admins.includes(uid)) return 3;
      if (moderators.includes(uid)) return 2;
      if (vips.includes(uid)) return 1;
      return 0;
    };

    if (getUserRole(senderID) > 0) return;

    try {
      const userInfo = await api.getUserInfo([senderID]);
      const name = userInfo[senderID]?.name || "Unknown User";

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Chat-Off System",
        headerSymbol: "🚫",
        headerStyle: "bold",
        bodyText: `⚠️ User ${name}, has been kicked, because did not follow GC rules.`,
        bodyStyle: "bold",
        footerText: "You have been removed automatically.",
      });

      await api.sendMessage(styledMessage, threadID);
      await api.removeUserFromGroup(senderID, threadID);
    } catch (err) {
      console.error(`Chat-Off Error | ${err.message}`);
    }
  },
};
