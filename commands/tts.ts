import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ttsCommand: ShadowBot.Command = {
  config: {
    name: "tts",
    author: "Aljur Pogoy",
    description: "Convert text to speech and send as audio.",
    role: 2,
    cooldown: 10,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    const text = args.join(" ");

    if (!text) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Text to Speech",
        headerSymbol: "🔊",
        headerStyle: "bold",
        bodyText: "Please provide a text.\nUsage: tts <your text>",
        bodyStyle: "sansSerif",
        footerText: "Developed by: **Aljur Pogoy**",
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }

    try {
      const { data: json } = await axios.get("https://api.tts.quest/v3/voicevox/synthesis", {
        params: { text },
        timeout: 15000,
      });

      // Check if success is true AND mp3DownloadUrl exists
      if (!json.success || !json.mp3DownloadUrl) {
        throw new Error("Failed to generate TTS audio.");
      }
      
      const mp3DownloadUrl: string = json.mp3DownloadUrl;
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
      const mp3Name = `tts_${crypto.randomUUID()}.mp3`;
      const mp3Path = path.join(cacheDir, mp3Name);
      
      const mp3Stream = await axios.get(mp3DownloadUrl, {
        responseType: "stream",
        timeout: 30000,
      });

      const mp3Writer = fs.createWriteStream(mp3Path);
      mp3Stream.data.pipe(mp3Writer);

      await new Promise((resolve, reject) => {
        mp3Writer.on("finish", resolve);
        mp3Writer.on("error", reject);
      });

      const audioMessage = AuroraBetaStyler.styleOutput({
        headerText: "Text to Speech",
        headerSymbol: "🔊",
        headerStyle: "bold",
        bodyText: `🗣️ ${text}`,
        bodyStyle: "sansSerif",
        footerText: "Developed by: **Aljur Pogoy**",
      });

      await new Promise<void>((resolve, reject) => {
        api.sendMessage(
          { body: audioMessage, attachment: fs.createReadStream(mp3Path) },
          threadID,
          (err: any) => {
            if (fs.existsSync(mp3Path)) {
              fs.unlinkSync(mp3Path);
            }
            if (err) reject(err);
            else resolve();
          },
          messageID
        );
      });

    } catch (error: any) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Text to Speech",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `Error: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "Developed by: **Aljur Pogoy**",
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default ttsCommand;
