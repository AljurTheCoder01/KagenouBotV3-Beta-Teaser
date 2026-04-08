import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ttkCommand: ShadowBot.Command = {
  config: {
    name: "ttk",
    description: "Search and send TikTok videos.",
    role: 0,
    cooldown: 10,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    const search = args.join(" ");

    if (!search) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "TikTok",
        headerSymbol: "❌",
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

      const video = json.data.videos[0];
      const { play, title, music } = video;
      
      const vidName = `vid_${crypto.randomUUID()}.mp4`;
      const vidPath = path.join(process.cwd(), "cache", vidName);

      if (!fs.existsSync(path.join(process.cwd(), "cache"))) {
        fs.mkdirSync(path.join(process.cwd(), "cache"));
      }

      const vidStream = await axios.get(play, { responseType: "stream" });
      const vidWriter = fs.createWriteStream(vidPath);
      vidStream.data.pipe(vidWriter);

      await new Promise((resolve, reject) => {
        vidWriter.on("finish", resolve);
        vidWriter.on("error", reject);
      });

      const videoMessage = AuroraBetaStyler.styleOutput({
        headerText: "TikTok",
        headerSymbol: "🎵",
        headerStyle: "bold",
        bodyText: `🎬 ${title}`,
        bodyStyle: "sansSerif",
        footerText: "Developed by: **Aljur Pogoy**",
      });

      await new Promise<void>((resolve, reject) => {
        api.sendMessage(
          { body: videoMessage, attachment: fs.createReadStream(vidPath) },
          threadID,
          (err) => {
            fs.unlinkSync(vidPath);
            if (err) reject(err);
            else resolve();
          },
          messageID
        );
      });
      const mp3Name = `aud_${crypto.randomUUID()}.mp3`;
      const mp3Path = path.join(process.cwd(), "cache", mp3Name);

      const mp3Stream = await axios.get(music, { responseType: "stream" });
      const mp3Writer = fs.createWriteStream(mp3Path);
      mp3Stream.data.pipe(mp3Writer);

      await new Promise((resolve, reject) => {
        mp3Writer.on("finish", resolve);
        mp3Writer.on("error", reject);
      });

      await new Promise<void>((resolve, reject) => {
        api.sendMessage(
          { body: "🎵 Audio", attachment: fs.createReadStream(mp3Path) },
          threadID,
          (err) => {
            fs.unlinkSync(mp3Path);
            if (err) reject(err);
            else resolve();
          }
        );
      });

    } catch (error) {
      console.error("TikTok Command Error:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "TikTok",
        headerSymbol: "",
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
