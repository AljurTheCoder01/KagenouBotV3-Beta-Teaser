
import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import AuroraBetaStyler from "@aurora/styler";

const vmCommand: ShadowBot.Command = {
  config: {
    name: "vm",
    description: "Search and send a random vm.",
    usage: "vm <search query>",
    aliases: ["voicemsg", "audio"],
    category: "Fun 🎉",
  },

  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    const query = args.join(" ").trim();
    if (!query) {
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Voice Message",
          headerSymbol: "🎙️",
          headerStyle: "bold",
          bodyText: "Please provide a search query.\nUsage: /vm <search query>\nExample: /vm fahhh",
          bodyStyle: "sansSerif",
          footerText: "Developed by: **Aljur pogoy**",
        }),
        threadID,
        messageID
      );
      return;
    }

    const cacheDir = path.join(process.cwd(), "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const filePath = path.join(cacheDir, `vm_${crypto.randomUUID()}.mp3`);

    try {
      const { data } = await axios.get(
        "https://myinstans-api-1--aljurdev.replit.app/search",
        { params: { name: query } }
      );

      const results = data?.results;
      if (!results || !results.length) {
        await api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "Voice Message",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: `No results found for "${query}".`,
            bodyStyle: "sansSerif",
            footerText: "Developed by: **Aljur pogoy**",
          }),
          threadID,
          messageID
        );
        return;
      }

      const picked = results[Math.floor(Math.random() * results.length)];
      const mp3Url = picked?.url;

      if (!mp3Url) {
        await api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "Voice Message",
            headerSymbol: "❌",
            headerStyle: "bold",
            bodyText: "Could not extract audio URL from the result.",
            bodyStyle: "sansSerif",
            footerText: "Developed by: **Aljur pogoy**",
          }),
          threadID,
          messageID
        );
        return;
      }

      const audioStream = await axios.get(mp3Url, { responseType: "stream" });
      const writer = fs.createWriteStream(filePath);
      audioStream.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await new Promise<void>((resolve, reject) => {
        api.sendMessage(
          {
            body: AuroraBetaStyler.styleOutput({
              headerText: "Voice Message",
              headerSymbol: "🎙️",
              headerStyle: "bold",
              bodyText: `🔍 Query: ${query}\n🎲 Picked 1 of ${results.length} result(s)`,
              bodyStyle: "sansSerif",
              footerText: "Developed by: **Aljur pogoy**",
            }),
            attachment: fs.createReadStream(filePath),
          },
          threadID,
          (err: any) => {
            if (fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch {}
            if (err) reject(err);
            else resolve();
          },
          messageID
        );
      });

    } catch (err: any) {
      if (fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch {}
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Voice Message",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: `Error: ${err.message}`,
          bodyStyle: "sansSerif",
          footerText: "Developed by: **Aljur pogoy**",
        }),
        threadID,
        messageID
      );
    }
  },
};

export default vmCommand;
