
import axios from "axios";
import fs from "fs";
import path from "path";
import AuroraBetaStyler from "@aurora/styler";

const waifuCommand: ShadowBot.Command = {
  config: {
    name: "waifu",
    description: "Sends a random waifu image.",
    usage: "/waifu",
    aliases: ["anime", "girl"],
    category: "Fun 🎉",
  },

  run: async ({ api, event }) => {
    const { threadID, messageID } = event;
    const filePath = path.join(process.cwd(), `waifu_${Date.now()}.jpg`);

    try {
      const response = await axios.get("https://api.waifu.pics/sfw/waifu");
      const imageUrl = response.data.url;
      const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });

      fs.writeFileSync(filePath, Buffer.from(imageResponse.data));

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: "Waifu",
        headerSymbol: "🌸",
        headerStyle: "bold",
        bodyText: "Here's your waifu! 💕",
        bodyStyle: "bold",
        footerText: "Developed by: **Aljur pogoy**",
      });

      await api.sendMessage(
        {
          body: styledMessage,
          attachment: fs.createReadStream(filePath),
        },
        threadID,
        messageID
      );
    } catch (err: any) {
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Waifu",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: `Failed to fetch waifu image.\n${err.message}`,
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

export default waifuCommand;
