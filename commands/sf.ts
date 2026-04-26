import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const sfCommand: ShadowBot.Command = {
  config: {
    name: "sf",
    description: "Compile and send an SFM video.",
    role: 0,
    cooldown: 15,
    nsfw: true,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    try {
      const { data: json } = await axios.get("https://oreo.gleeze.com/api/sfmcompile", {
        params: { stream: false },
      });

      const videoUrl: string = json?.videoUrl;
      const title: string = json?.title || "SFM Video";

      if (!videoUrl) {
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

      const cacheDir = path.join(process.cwd(), "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const vidName = `sf_${crypto.randomUUID()}.mp4`;
      const vidPath = path.join(cacheDir, vidName);

      const vidStream = await axios.get(videoUrl, { responseType: "stream" });
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

      await new Promise<void>((resolve, reject) => {
        api.sendMessage(
          { body: videoMessage, attachment: fs.createReadStream(vidPath) },
          threadID,
          (err: any) => {
            fs.unlinkSync(vidPath);
            if (err) reject(err);
            else resolve();
          },
          messageID
        );
      });

    } catch (error: any) {
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "SFM Compile",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `Err: ${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "Developed by: **Aljur Pogoy**",
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default sfCommand;
