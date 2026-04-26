import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const sfCommand: ShadowBot.Command = {
  config: {
    name: "sf",
    author: "Aljur Pogoy",
    description: "Compile and send an SFM video.",
    role: 0,
    cooldown: 15,
  },
  run: async ({ api, event }) => {
    const { threadID, messageID } = event;

    try {
      const { data: json } = await axios.get("https://oreo.gleeze.com/api/sfmcompile", {
        params: { stream: false },
      });

      const title: string = json?.title || "SFM Video";
      const playerUrl: string = json?.player;
      const videoUrl: string = json?.videoUrl;

      if (!playerUrl && !videoUrl) {
        const errorMessage = AuroraBetaStyler.styleOutput({
          headerText: "SFM Compile",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: "No video URL returned from the API.",
          bodyStyle: "sansSerif",
          footerText: "Developed by: **Aljur Pogoy**",
        });
        return api.sendMessage(errorMessage, threadID, messageID);
      }

      const rawParam = playerUrl
        ? new URL(playerUrl).searchParams.get("url")
        : null;

      const downloadUrl = rawParam
        ? decodeURIComponent(rawParam)
        : videoUrl;

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const vidName = `sf_${crypto.randomUUID()}.mp4`;
      const vidPath = path.join(cacheDir, vidName);

      const vidStream = await axios.get(downloadUrl, {
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://sfmcompile.club/",
        },
        timeout: 60000,
      });

      const vidWriter = fs.createWriteStream(vidPath);
      vidStream.data.pipe(vidWriter);

      await new Promise((resolve, reject) => {
        vidWriter.on("finish", resolve);
        vidWriter.on("error", reject);
      });

      const videoMessage = AuroraBetaStyler.styleOutput({
        headerText: "SFM Compile",
        headerSymbol: "🎬",
        headerStyle: "bold",
        bodyText: `🎬 ${title}`,
        bodyStyle: "sansSerif",
        footerText: "Developed by: **Aljur Pogoy**",
      });

      await api.sendMessage(
        {
          body: videoMessage,
          attachment: fs.createReadStream(vidPath),
        },
        threadID,
        messageID
      );

      fs.unlinkSync(vidPath);

    } catch (error: any) {
      console.error("SFM Command Error:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "SFM Compile",
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

export default sfCommand;
