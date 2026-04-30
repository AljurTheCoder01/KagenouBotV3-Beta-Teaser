import AuroraBetaStyler from "@aurora/styler";
import axios from "axios";

const REPLY_TTL = 30 * 60 * 1000;

function registerEnkiduListener(msgID: string, callback: Function, data: any = {}) {
  if (!global.replyListeners) global.replyListeners = new Map();
  global.replyListeners.set(msgID, {
    callback,
    data,
    expiresAt: Date.now() + REPLY_TTL,
  });
}

async function gpt4(prompt: string, customId: string, link?: string): Promise<string> {
  try {
    const endpoint = prompt.toLowerCase() === "clear" ? "/clear" : "/chat";
    const data =
      prompt.toLowerCase() === "clear"
        ? { id: customId }
        : { prompt, customId, ...(link && { link }) };

    const res = await axios.post(
      `${String.fromCharCode(104,116,116,112,115,58,47,47,99,97,100,105,115,46,111,110,114,101,110,100,101,114,46,99,111,109)}${endpoint}`,
      data
    );
    return res.data.message;
  } catch (error: any) {
    return error.message;
  }
}

const shaeCommand: ShadowBot.Command = {
  config: {
    name: "shae",
    author: "Aljur Pogoy",
    description: "Chat with Shae AI.",
    role: 0,
    cooldown: 5,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID, messageReply } = event;

    const prompt = args.join(" ") || "hello";

    const link =
      messageReply?.attachments?.[0]?.type === "photo"
        ? messageReply.attachments[0].url
        : undefined;

    const response = await gpt4(prompt, senderID, link);

    const styledMessage = AuroraBetaStyler.styleOutput({
      headerText: "Shae AI",
      headerSymbol: "🤖",
      headerStyle: "bold",
      bodyText: response,
      bodyStyle: "sansSerif",
      footerText: "Developed by: **Aljur Pogoy**",
    });

    api.sendMessage(styledMessage, threadID, async (err: any, info: any) => {
      if (err || !info?.messageID) return;

      registerEnkiduListener(info.messageID, async ({ api: replyApi, event: replyEvent }: any) => {
        if (replyEvent.senderID !== senderID) return;

        const replyPrompt = replyEvent.body?.trim() || "hello";
        const replyResponse = await gpt4(replyPrompt, senderID);

        const replyMessage = AuroraBetaStyler.styleOutput({
          headerText: "Shae AI",
          headerSymbol: "🤖",
          headerStyle: "bold",
          bodyText: replyResponse,
          bodyStyle: "sansSerif",
          footerText: "Developed by: **Aljur Pogoy**",
        });

        replyApi.sendMessage(replyMessage, replyEvent.threadID, async (e: any, i: any) => {
          if (e || !i?.messageID) return;

          registerEnkiduListener(i.messageID, async ({ api: nextApi, event: nextEvent }: any) => {
            if (nextEvent.senderID !== senderID) return;

            const nextPrompt = nextEvent.body?.trim() || "hello";
            const nextResponse = await gpt4(nextPrompt, senderID);

            const nextMessage = AuroraBetaStyler.styleOutput({
              headerText: "Shae AI",
              headerSymbol: "🤖",
              headerStyle: "bold",
              bodyText: nextResponse,
              bodyStyle: "sansSerif",
              footerText: "Developed by: **Aljur Pogoy**",
            });

            nextApi.sendMessage(nextMessage, nextEvent.threadID, async (ne: any, ni: any) => {
              if (ne || !ni?.messageID) return;
              registerContinuousListener(ni.messageID, senderID, nextApi);
            }, nextEvent.messageID);
          }, { senderID });
        }, replyEvent.messageID);
      }, { senderID });
    }, messageID);
  },
};

function registerContinuousListener(msgID: string, senderID: string, api: any) {
  registerEnkiduListener(msgID, async ({ api: replyApi, event: replyEvent }: any) => {
    if (replyEvent.senderID !== senderID) return;

    const prompt = replyEvent.body?.trim() || "hello";
    const response = await gpt4(prompt, senderID);

    const message = AuroraBetaStyler.styleOutput({
      headerText: "Shae AI",
      headerSymbol: "🤖",
      headerStyle: "bold",
      bodyText: response,
      bodyStyle: "sansSerif",
      footerText: "Developed by: **Aljur Pogoy**",
    });

    replyApi.sendMessage(message, replyEvent.threadID, async (err: any, info: any) => {
      if (err || !info?.messageID) return;
      registerContinuousListener(info.messageID, senderID, replyApi);
    }, replyEvent.messageID);
  }, { senderID });
}

export default shaeCommand;
