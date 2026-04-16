import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const REPLY_TTL = 30 * 60 * 1000;

function registerEnkiduListener(msgID: string, callback: Function, data: any = {}) {
  if (!global.replyListeners) global.replyListeners = new Map();
  global.replyListeners.set(msgID, {
    callback,
    data,
    expiresAt: Date.now() + REPLY_TTL,
  });
}

const ttkCommand: ShadowBot.Command = {
  config: {
    name: "ttk",
    description: "Search and send TikTok videos.",
    role: 0,
    cooldown: 10,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;

    const search = args.join(" ");

    if (!search) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "TikTok",
        headerSymbol: "",
        headerStyle: "bold",
        bodyText: "Please provide a search query.\nUsage: ttk <search query>",
        bodyStyle: "sansSerif",
        footerText: "Developed by: **Aljur Pogoy**",
      });
      return api.sendMessage(errorMessage, threadID, messageID);
    }

    try {
      const { data: json } = await axios.get("https://tikwm.com/api/feed/search", {
        params: { keywords: search },
      });

      if (json.code !== 0 || !json.data?.videos?.length) {
        throw new Error("No results found.");
      }

      const videos: any[] = json.data.videos.slice(0, 10);

      const listBody = videos
        .map((v, i) => `${i + 1}. ${v.title || "Untitled"}`)
        .join("\n");

      const selectionMessage = AuroraBetaStyler.styleOutput({
        headerText: "TikTok Search Results",
        headerSymbol: "🎵",
        headerStyle: "bold",
        bodyText: `${listBody}\n\nReply with a number (1-${videos.length}) to download.`,
        bodyStyle: "sansSerif",
        footerText: "Developed by: **Aljur Pogoy**",
      });

      const listMsgInfo: any = await new Promise(resolve => {
        api.sendMessage(selectionMessage, threadID, (err: any, info: any) => resolve(info), messageID);
      });

      const listMsgID = listMsgInfo?.messageID;
      if (!listMsgID) return;

      registerEnkiduListener(listMsgID, async ({ api: replyApi, event: replyEvent }: any) => {
        if (replyEvent.senderID !== senderID) return;

        const { threadID: tid, messageID: mid } = replyEvent;
        const choice = parseInt(replyEvent.body?.trim(), 10);

        if (isNaN(choice) || choice < 1 || choice > videos.length) {
          await replyApi.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: "TikTok",
              headerSymbol: "❌",
              headerStyle: "bold",
              bodyText: `Invalid choice. Reply with a number between 1 and ${videos.length}.`,
              bodyStyle: "sansSerif",
              footerText: "Developed by: **Aljur Pogoy**",
            }),
            tid,
            mid
          );
          return;
        }

        const video = videos[choice - 1];
        const { play, title, music } = video;

        const cacheDir = path.join(process.cwd(), "cache");
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

        const vidName = `vid_${crypto.randomUUID()}.mp4`;
        const vidPath = path.join(cacheDir, vidName);

        const vidStream = await axios.get(play, { responseType: "stream" });
        const vidWriter = fs.createWriteStream(vidPath);
        vidStream.data.pipe(vidWriter);

        await new Promise((resolve, reject) => {
          vidWriter.on("finish", resolve);
          vidWriter.on("error", reject);
        });

        const videoMessage = AuroraBetaStyler.styleOutput({
          headerText: "TikTok",
          headerSymbol: "🎬",
          headerStyle: "bold",
          bodyText: `🎬 ${title}\n\nReply with another number (1-${videos.length}) to download more.`,
          bodyStyle: "sansSerif",
          footerText: "Developed by: **Aljur Pogoy**",
        });

        await new Promise<void>((resolve, reject) => {
          replyApi.sendMessage(
            { body: videoMessage, attachment: fs.createReadStream(vidPath) },
            tid,
            (e: any) => {
              fs.unlinkSync(vidPath);
              if (e) reject(e);
              else resolve();
            },
            mid
          );
        });

        const mp3Name = `aud_${crypto.randomUUID()}.mp3`;
        const mp3Path = path.join(cacheDir, mp3Name);

        const mp3Stream = await axios.get(music, { responseType: "stream" });
        const mp3Writer = fs.createWriteStream(mp3Path);
        mp3Stream.data.pipe(mp3Writer);

        await new Promise((resolve, reject) => {
          mp3Writer.on("finish", resolve);
          mp3Writer.on("error", reject);
        });

        await new Promise<void>((resolve, reject) => {
          replyApi.sendMessage(
            { body: "🎵 Audio", attachment: fs.createReadStream(mp3Path) },
            tid,
            (e: any) => {
              fs.unlinkSync(mp3Path);
              if (e) reject(e);
              else resolve();
            },
            mid
          );
        });
      }, { videos });

    } catch (error: any) {
      console.error("TikTok Command Error:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "TikTok",
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

export default ttkCommand;
