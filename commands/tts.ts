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

      const tranChat = await axios.get(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=${encodeURIComponent(text)}`
      );
      const japaneseText = tranChat.data[0][0][0];

      const cacheDir = resolve(__dirname, 'cache');
      fs.ensureDirSync(cacheDir);
      const cachePath = resolve(cacheDir, `${threadID}_${senderID}.mp3`);

      let mp3Url: string | null = null;

      try {
        const ttsResponse = await axios.get(
          `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(japaneseText)}&speaker=3`,
          { timeout: 15000 }
        );

        if (ttsResponse.data?.mp3StreamingUrl) {
          mp3Url = ttsResponse.data.mp3StreamingUrl;
        } else if (ttsResponse.data?.mp3DownloadUrl) {
          mp3Url = ttsResponse.data.mp3DownloadUrl;
        } else if (ttsResponse.data?.success === false) {
          throw new Error("TTS synthesis failed");
        }
      } catch (primaryError) {
        const voiceTextUrl = `https://api.voicetext.jp/v1/tts`;
        const fallbackResponse = await axios.post(
          voiceTextUrl,
          new URLSearchParams({
            text: japaneseText,
            speaker: "hikari",
            format: "mp3",
          }),
          {
            auth: { username: "YOUR_VOICETEXT_API_KEY", password: "" },
            responseType: "stream",
            timeout: 15000,
          }
        );

        const writer = fs.createWriteStream(cachePath);
        fallbackResponse.data.pipe(writer);
        await new Promise<void>((res, rej) => {
          writer.on("finish", res);
          writer.on("error", rej);
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

        return api.sendMessage(
          { body: audioMessage, attachment: audioStream },
          threadID,
          () => unlinkSync(cachePath),
          messageID
        );
      }

      if (!mp3Url) throw new Error("No MP3 URL returned from TTS API.");

      const mp3Stream = await axios.get(mp3Url, {
        responseType: "stream",
        timeout: 30000,
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      const writer = fs.createWriteStream(cachePath);
      mp3Stream.data.pipe(writer);

      await new Promise<void>((res, rej) => {
        writer.on("finish", res);
        writer.on("error", rej);
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

      api.sendMessage(
        { body: audioMessage, attachment: audioStream },
        threadID,
        () => unlinkSync(cachePath),
        messageID
      );

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
