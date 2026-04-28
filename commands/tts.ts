import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";
import fs from "fs-extra";
import path from "path";

const ttsCommand: ShadowBot.Command = {
  config: {
    name: "tts",
    author: "Aljur Pogoy",
    description: "Convert text to speech and send as audio.",
    role: 2,
    cooldown: 10,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const { createReadStream, unlinkSync } = fs;
    const { resolve } = path;

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
      const tranChat = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=${encodeURIComponent(text)}`);
      const japaneseText = tranChat.data[0][0][0];

      const response = await axios.get(`https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(japaneseText)}&speaker=3`);

      if (!response.data.success || !response.data.mp3DownloadUrl) {
        throw new Error("Failed to generate TTS audio.");
      }

      const mp3Url = response.data.mp3DownloadUrl;
      const cachePath = resolve(__dirname, 'cache', `${threadID}_${senderID}.mp3`);

      if (!fs.existsSync(path.join(__dirname, 'cache'))) {
        fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });
      }

      await global.utils.downloadFile(mp3Url, cachePath);

      const audioMessage = AuroraBetaStyler.styleOutput({
        headerText: "Text to Speech",
        headerSymbol: "🔊",
        headerStyle: "bold",
        bodyText: `🗣️ ${text}`,
        bodyStyle: "sansSerif",
        footerText: "Developed by: **Aljur Pogoy**",
      });

      api.sendMessage({
        body: audioMessage,
        attachment: createReadStream(cachePath)
      }, threadID, () => {
        if (fs.existsSync(cachePath)) {
          unlinkSync(cachePath);
        }
      }, messageID);

    } catch (error: any) {
      console.error("TTS Error:", error);
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
