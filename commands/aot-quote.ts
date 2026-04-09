
import axios from "axios";
import AuroraBetaStyler from "@aurora/styler";

const aotQuoteCommand: ShadowBot.Command = {
  config: {
    name: "aot-quote",
    description: "Get a random Attack on Titan quote.",
    usage: "aot-quote",
    aliases: ["aot", "titanquote"],
    category: "Fun 🎉",
  },

  run: async ({ api, event }) => {
    const { threadID, messageID } = event;

    try {
      const response = await axios.get("https://aot-api.vercel.app/quote");
      const { quote, author } = response.data;

      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Attack on Titan",
          headerSymbol: "⚔️",
          headerStyle: "bold",
          bodyText: `"${quote}"\n\n— ${author}`,
          bodyStyle: "bold",
          footerText: "Developed by: **Aljur pogoy**",
        }),
        threadID,
        messageID
      );
    } catch (err: any) {
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Attack on Titan",
          headerSymbol: "🚫",
          headerStyle: "bold",
          bodyText: `Failed to fetch quote.\n${err.message}`,
          bodyStyle: "bold",
          footerText: "Developed by: **Aljur pogoy**",
        }),
        threadID,
        messageID
      );
    }
  },
};

export default aotQuoteCommand;
