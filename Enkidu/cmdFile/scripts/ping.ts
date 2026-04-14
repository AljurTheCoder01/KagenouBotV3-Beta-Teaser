const AuroraStyler = require("@aurora/styler");

const ping: EnkiduBot.Command = {
  config: {
    name: "ping",
    version: "1.0.0",
    cooldown: 5,
    description: "Check bot response time.",
    author: "Aljur Pogoy",
    nonPrefix: false,
    role: 0,
    aliases:["pong"],
  },

  async run({ api, event }: EnkiduRunContext) {
    const start = Date.now();
    api.sendMessage(
      AuroraStyler.styleOutput({
        headerText:   "Pong! 🏓",
        headerSymbol: "⚡",
        headerStyle:  "bold",
        bodyText:     `Response time: **${Date.now() - start}ms**\nBot is **online** and running.`,
        bodyStyle:    "sansSerif",
        footerText:   `***EnkiduBot***`,
      }),
      event.threadID, event.messageID
    );
  },
};

export default ping;
