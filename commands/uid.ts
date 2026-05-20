import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";
import * as cheerio from "cheerio";

const normalizeUrl = (input: string): string => {
  if (!input.startsWith("http")) {
    return "https://www.facebook.com/" + input;
  }
  return input;
};

const uidCommand: ShadowBot.Command = {
  config: {
    name: "uid",
    description: "Get uid",
    role: 0,
    cooldown: 5,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID, messageReply, mentions } = event;

    try {
      let uid: string | null = null;
      let responseText = "";
      if (!args.length && !messageReply && Object.keys(mentions).length === 0) {
        uid = senderID;
        responseText = `${uid}`;
      }
      else if (messageReply) {
        uid = messageReply.senderID;
        responseText = `Replied user: ${uid}`;
      }
      else if (Object.keys(mentions).length > 0) {
        const mention = Object.keys(mentions)[0];
        uid = mention;
        responseText = `${uid}`;
      }
      else if (args[0] && args[0].startsWith("http")) {
        const url = normalizeUrl(args[0]);

        const response = await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          },
        });

        const html = response.data;
        const $ = cheerio.load(html);

        let scraped: string | null = null;

        const idMatch = html.match(/profile\.php\?id=(\d+)/);
        if (idMatch) scraped = idMatch[1];

        if (!scraped) {
          const entityMatch = html.match(/"entity_id":"(\d+)"/);
          if (entityMatch) scraped = entityMatch[1];
        }

        if (!scraped) {
          const userMatch = html.match(/"userID":"(\d+)"/);
          if (userMatch) scraped = userMatch[1];
        }

        if (scraped) {
          uid = scraped;
          responseText = `✅ | UID from URL: ${uid}`;
        } else {
          responseText = "❌ UID not found. Profile might be private or layout changed.";
        }
      } else {
        responseText = "❌";
      }
     /**
     * @aurora-styler
     */
      const replyMessage = AuroraBetaStyler.styleOutput({
        headerText: "UID",
        headerSymbol: "💻",
        headerStyle: "bold",
        bodyText: responseText,
        bodyStyle: "sansSerif",
        footerText: "**Developed by:** Aljur Pogoy",
      });

      await api.sendMessage(replyMessage, threadID, messageID);
    } catch (error) {
      console.error("UID Command Error:", error);
      const errorMessage = AuroraBetaStyler.styleOutput({
        headerText: "UID Lookup",
        headerSymbol: "❌",
        headerStyle: "bold",
        bodyText: `${error.message}`,
        bodyStyle: "sansSerif",
        footerText: "Powered by Kaiz API",
      });
      api.sendMessage(errorMessage, threadID, messageID);
    }
  },
};

export default uidCommand;
