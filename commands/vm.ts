import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";
import { HttpsProxyAgent } from "https-proxy-agent";
import AuroraBetaStyler from "@aurora/styler";

const PROXY = ""; 

function getAgent() {
  if (!PROXY) return null;
  return new HttpsProxyAgent(`http://${PROXY}`);
}

async function fetchHTML(url: string) {
  const agent = getAgent();

  const res = await axios.get(url, {
    httpAgent: agent || undefined,
    httpsAgent: agent || undefined,
    timeout: 10000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Referer": "https://www.myinstants.com/"
    },
    validateStatus: () => true
  });

  if (res.status !== 200) throw new Error("Failed to fetch page");
  return res.data;
}

const vmCommand = {
  config: {
    name: "vm",
    description: "Search and send a random voice/audio message.",
    usage: "/vm <search query>",
    aliases: ["voicemsg", "audio"],
    category: "Fun 🎉",
  },

  run: async ({ api, event, args }: any) => {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();

    if (!query) {
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "Voice Message",
          headerSymbol: "🎙️",
          headerStyle: "bold",
          bodyText: "Please provide a search query.",
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
      const html = await fetchHTML(url);

      const $ = cheerio.load(html);
      const results: { name: string; url: string }[] = [];

      $(".instant").each((_, el) => {
        const name = $(el).find(".instant-link").text().trim();
        const onclick = $(el).find(".small-button").attr("onclick");

        if (onclick) {
          const match = onclick.match(/play\('(.*?)'\)/);
          if (match?.[1]) {
            results.push({
              name: name || "Unknown",
              url: "https://www.myinstants.com" + match[1],
            });
          }
        }
      });

      if (!results.length) throw new Error("No results found");

      const picked = results[Math.floor(Math.random() * results.length)];

      const audio = await axios.get(picked.url, {
        responseType: "stream",
        headers: { "User-Agent": "Mozilla/5.0" },
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
              bodyText: `🔍 ${query}\n🎵 ${picked.name}`,
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
          bodyText: err.message,
          bodyStyle: "sansSerif",
          footerText: "Developed by: **Aljur pogoy**",
        }),
        threadID,
        messageID
      );
    }
  }
};

export default vmCommand;
