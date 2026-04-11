
import axios from "axios";
import fs from "fs";
import path from "path";
import AuroraBetaStyler from "@aurora/styler";

const erohereCommand: ShadowBot.Command = {
  config: {
    name: "cosplaytele",
    description: "Sends a random 18+ image.",
    usage: "tili",
    aliases: ["kusplitili", "tili"],
    category: "18+ 🎉",
  },

  run: async ({ api, event }) => {
    const { threadID, messageID } = event;
    const filePath = path.join(process.cwd(), `erohere_${Date.now()}.jpg`);

    try {
      const response = await axios.get(
        "https://oreo.gleeze.com/api/cosplaytele?search=girls&stream=true&limit=10",
        { responseType: "arraybuffer" }
      );

      fs.writeFileSync(filePath, Buffer.from(response.data));

      const sentInfo = await new Promise<any>((resolve, reject) => {
        api.sendMessage(
          {
            body: AuroraBetaStyler.styleOutput({
              headerText: "Cosplaytele",
              headerSymbol: "🌸",
              headerStyle: "bold",
              bodyText: "Goon now! 💦💦",
              bodyStyle: "bold",
              footerText: "Developed by: **Aljur pogoy**",
            }),
            attachment: fs.createReadStream(filePath),
          },
          threadID,
          (err: any, info: any) => { if (err) reject(err); else resolve(info); },
          messageID
        );
      });

      setTimeout(async () => {
        try {
          await api.unsendMessage(sentInfo.messageID);
        } catch {
          try {
            await api.deleteMessage(sentInfo.messageID);
          } catch {}
        }
      }, 5000);
    } catch (err: any) {
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Cosplaytele",
          headerSymbol: "⚠️",
          headerStyle: "bold",
          bodyText: `Failed image.\n${err.message}`,
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
