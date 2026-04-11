import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";
import AuroraBetaStyler from "@aurora/styler";

const PROXY_LISTS = [
  "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",
  "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks4.txt",
  "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt"
];

let proxyCache: string[] = [];

async function loadProxies() {
  if (proxyCache.length) return proxyCache;

  const data = await Promise.all(
    PROXY_LISTS.map(url =>
      axios.get(url).then(r => r.data).catch(() => "")
    )
  );

  proxyCache = data
    .join("\n")
    .split("\n")
    .map(p => p.trim())
    .filter(p => p && p.includes(":"));

  return proxyCache;
}

function pickProxy(proxies: string[]) {
  return proxies[Math.floor(Math.random() * proxies.length)];
}

async function fetchHTML(url: string, proxies: string[]) {
  for (let i = 0; i < 20; i++) {
    const proxy = pickProxy(proxies);

    try {
      const res = await axios.get(url, {
        proxy: {
          host: proxy.split(":")[0],
          port: Number(proxy.split(":")[1]),
        },
        timeout: 8000,
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

      if (res.status === 200 && res.data) return res.data;
    } catch {}
  }

  throw new Error("All proxies failed");
}


const vmCommand: ShadowBot.Command = {
  config: {
    name: "vm",
    description: "Search and send a random voice/audio message.",
    usage: "vm <search query>",
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
      const proxies = await loadProxies();
      if (!proxies.length) throw new Error("No proxies loaded");

      const url = `https://www.myinstants.com/search/?name=${encodeURIComponent(query)}`;
      const html = await fetchHTML(url, proxies);

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
  },
};

export default vmCommand;
