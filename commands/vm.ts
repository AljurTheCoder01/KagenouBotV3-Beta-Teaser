import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";
import AuroraBetaStyler from "@aurora/styler";


const vmCommand: ShadowBot.Command = {
  config: {
    name: "vm",
    description: "Search and send a random voice/audio message.",
    usage: "/vm <search query>",
    aliases: ["voicemsg", "audio"],
    category: "Fun 🎉",
  },

  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();

    if (!query) {
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Voice Message",
          headerSymbol: "🎙️",
          headerStyle: "bold",
          bodyText: "Please provide a search query.\nExample: /vm bruh",
          bodyStyle: "sansSerif",
          footerText: "Developed by: **Aljur pogoy**",
        }),
        threadID,
        messageID
      );
    }

    const cacheDir = path.join(process.cwd(), "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const filePath = path.join(cacheDir, `vm_${crypto.randomUUID()}.mp3`);

    try {
      const url = `https://www.myinstants.com/search/?name=${encodeURIComponent(query)}`;

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.myinstants.com/",
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const results: { name: string; url: string }[] = [];

      $(".instant").each((_, elem) => {
        const name = $(elem).find(".instant-link").text().trim();
        const onclick = $(elem).find(".small-button").attr("onclick");

        if (onclick) {
          const match = onclick.match(/play\('(.*?)'\)/);
          if (match && match[1]) {
            results.push({
              name: name || "Unknown",
              url: "https://www.myinstants.com" + match[1],
            });
          }
        }
      });

      if (!results.length) {
        return api.sendMessage(
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
      }

      const picked = results[Math.floor(Math.random() * results.length)];

      const audio = await axios.get(picked.url, {
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      const writer = fs.createWriteStream(filePath);
      audio.data.pipe(writer);

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
              bodyText: `🔍 Query: ${query}\n🎵 ${picked.name}\n🎲 ${results.length} result(s)`,
              bodyStyle: "sansSerif",
              footerText: "Developed by: **Aljur pogoy**",
            }),
            attachment: fs.createReadStream(filePath),
          },
          threadID,
          (err: any) => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            if (err) reject(err);
            else resolve();
          },
          messageID
        );
      });

    } catch (err: any) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      api.sendMessage(
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
