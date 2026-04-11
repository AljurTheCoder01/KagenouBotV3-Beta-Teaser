import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import AuroraBetaStyler from "@aurora/styler";

const PROXY_SOURCES = [
  "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",
  "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks4.txt",
  "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt"
];

let proxyCache: string[] = [];

async function loadProxies() {
  if (proxyCache.length) return proxyCache;
  const lists = await Promise.all(
    PROXY_SOURCES.map(url => axios.get(url).then(r => r.data).catch(() => ""))
  );
  proxyCache = lists.join("\n").split("\n").map(p => p.trim()).filter(Boolean);
  return proxyCache;
}

function getAgent(proxy: string) {
  if (proxy.startsWith("socks")) return new SocksProxyAgent(proxy);
  return new HttpsProxyAgent("http://" + proxy);
}

async function tryFetch(url: string, proxy: string) {
  try {
    const agent = getAgent(proxy);
    const res = await axios.get(url, {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 8000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.myinstants.com/"
      },
      validateStatus: () => true
    });
    if (res.status === 200 && res.data) return res.data;
  } catch {}
  return null;
}

async function fetchHTML(url: string, proxies: string[]) {
  const shuffled = proxies.sort(() => 0.5 - Math.random()).slice(0, 25);

  const tasks = shuffled.map(p => tryFetch(url, p));

  const results = await Promise.all(tasks);
  const success = results.find(r => r);

  if (!success) throw new Error("All proxies failed");

  return success;
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
      if (!proxies.length) throw new Error("No proxies");

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

      if (!results.length) throw new Error("No results");

      const picked = results[Math.floor(Math.random() * results.length)];

      const audio = await axios.get(picked.url, {
        responseType: "stream",
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      const writer = fs.createWriteStream(filePath);
      audio.data.pipe(writer);

      await new Promise<void>((res, rej) => {
        writer.on("finish", res);
        writer.on("error", rej);
      });

      await new Promise<void>((res, rej) => {
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
            if (err) rej(err);
            else res();
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
