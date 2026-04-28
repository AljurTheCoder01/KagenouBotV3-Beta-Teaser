import axios from "axios";
import fs from "fs-extra";
import path from "path";
import AuroraBetaStyler from "@aurora/styler";

const ttsCommand: ShadowBot.Command = {
  config: {
    name: "tts",
    author: "Aljur Pogoy",
    description: "Convert text to speech and send as audio.",
    role: 2,
    cooldown: 10,
  },
  run: async ({ api, event, args, message }) => {
    try {
      const { createReadStream, unlinkSync } = fs;
      const { resolve } = path;
      const { messageID, threadID, senderID } = event;

      const getUserInfo = async (api: any, userID: any) => {
        try {
          const userInfo = await api.getUserInfo(userID);
          return userInfo[userID].firstName;
        } catch (error) {
          console.error(`Error fetching user info: ${error}`);
          return '';
        }
      };

      const [a, b] = ["Konichiwa", "senpai"];

      const k = await getUserInfo(api, senderID);
      const ranGreet = `${a} ${k} ${b}`;

      const text = args.join(" ");

      if (!args[0]) {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: "Text to Speech",
          headerSymbol: "🔊",
          headerStyle: "bold",
          bodyText: ranGreet + "\n\nPlease provide a text.\nUsage: tts <your text>",
          bodyStyle: "sansSerif",
          footerText: "Developed by: **Aljur Pogoy**",
        });
        return api.sendMessage(errorMessage, threadID, messageID);
      }

      const tranChat = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=${encodeURIComponent(text)}`);
      const japaneseText = tranChat.data[0][0][0];

      const cachePath = resolve(__dirname, 'cache', `${threadID}_${senderID}.mp3`);

      const ttsResponse = await axios.get(`https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(japaneseText)}&speaker=3`);

      const mp3Url = ttsResponse.data.mp3DownloadUrl;

      const writer = fs.createWriteStream(cachePath);
      const mp3Stream = await axios.get(mp3Url, { responseType: 'stream' });
      mp3Stream.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const audioStream = createReadStream(cachePath);

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
        attachment: audioStream
      }, threadID, () => unlinkSync(cachePath), messageID);

    } catch (error) {
      console.error(error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "Text to Speech",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: "Error: Failed to generate TTS audio.",
        bodyStyle: "sansSerif",
        footerText: "Developed by: **Aljur Pogoy**",
      });
      api.sendMessage(errorMessage, event.threadID, event.messageID);
    }
  },
};

export default ttsCommand;
