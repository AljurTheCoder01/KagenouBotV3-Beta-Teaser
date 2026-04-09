
import axios from "axios";
import fs from "fs";
import path from "path";
import AuroraBetaStyler from "@aurora/styler";

const erohereCommand: ShadowBot.Command = {
  config: {
    name: "erohere",
    description: "Sends a random 18+ image.",
    usage: "erohere",
    aliases: ["eh", "anime-img"],
    category: "Fun 🎉",
  },

  run: async ({ api, event }) => {
    const { threadID, messageID } = event;
    const filePath = path.join(process.cwd(), `erohere_${Date.now()}.jpg`);

    try {
      const response = await axios.get(
        "https://oreo.gleeze.com/api/erohere?search=&stream=true&limit=1&page=&random=1&proxy=false",
        { responseType: "arraybuffer" }
      );

      fs.writeFileSync(filePath, Buffer.from(response.data));

      await api.sendMessage(
        {
          body: AuroraBetaStyler.styleOutput({
            headerText: "Erohere",
            headerSymbol: "🌸",
            headerStyle: "bold",
            bodyText: "Here's your random anime image! 💕",
            bodyStyle: "bold",
            footerText: "Developed by: **Aljur pogoy**",
          }),
          attachment: fs.createReadStream(filePath),
        },
        threadID,
        messageID
      );
    } catch (err: any) {
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Erohere",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: `Failed to fetch image.\n${err.message}`,
          bodyStyle: "bold",
          footerText: "Developed by: **Aljur pogoy**",
        }),
        threadID,
        messageID
      );
    } finally {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }
  },
};

export default erohereCommand;
