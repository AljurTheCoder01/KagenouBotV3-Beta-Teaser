"use strict";

const AuroraStyler = require("@aurora-styler");

const help = {
  config: {
    name: "help",
    version: "1.0.0",
    cooldown: 5,
    description: "List all available commands.",
    author: "Aljur Pogoy",
    nonPrefix: false,
    role: 0,
    aliases: ["h", "cmds"],
  },

  async run({ api, event, commands, prefix }) {
    const seen = new Set();
    const lines = [];
    for (const [, cmd] of commands) {
      const name = cmd.config.name;
      if (seen.has(name)) continue;
      seen.add(name);
      lines.push(`• **${prefix}${name}** — ${cmd.config.description}`);
    }
    const message = AuroraStyler.styleOutput({
      headerText: "Command List",
      headerSymbol: "📜",
      headerStyle: "bold",
      bodyText: lines.join("\n"),
      bodyStyle: "sansSerif",
      footerText: `Total: ***${seen.size} commands***`,
    });

    api.sendMessage(message, event.threadID, event.messageID);
  },
};

module.exports = help;
