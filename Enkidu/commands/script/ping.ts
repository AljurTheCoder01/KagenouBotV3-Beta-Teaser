const AuroraStyler = require("@aurora-styler");

const ping: EnkiduBot.Command = {
  config: {
    name: "ping",
    version: "1.0.0",
    cooldown: 5,
    description: "Check bot response time.",
    author: "Aljur Pogoy",
    nonPrefix: false,
    role: 0,
    aliases: ["pong"],
  },

  async run({ api, event }: EnkiduRunContext) {
    const start = Date.now();
    const latency = Date.now() - start;

    const message = AuroraStyler.styleOutput({
      headerText: "Pong! 🏓",
      headerSymbol: "⚡",
      headerStyle: "bold",
      bodyText: `Response time: **${latency}ms**\nBot is **online** and running.`,
      bodyStyle: "sansSerif",
      footerText: `***EnkiduBot*** • ${global.config.botName}`,
    });

    api.sendMessage(message, event.threadID, event.messageID);
  },
};

export default ping;
