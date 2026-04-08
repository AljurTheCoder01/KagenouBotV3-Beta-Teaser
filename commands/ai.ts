import axios from 'axios';
import AuroraBetaStyler from '@aurora/styler';

const aiCommand: ShadowBot.Command = {
  config: {
    name: 'ai',
    description: 'Chat with AI',
    usage: 'ai <message>',
    nonPrefix: true,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    if (!threadID || !messageID) return;

    const query = args.join(' ').trim();
    if (!query) {
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'Query',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Please provide a message.',
          bodyStyle: 'sansSerif',
          footerText: 'Developed by: **Aljur Pogoy**',
        }),
        threadID,
        messageID
      );
    }

    const askAI = async (text: string) => {
      const res = await axios.get('https://kaiz-apis.mooo.com/api/aria', {
        params: {
          ask: text,
          uid: senderID,
          apikey: '5bcb48a7-e2a6-4704-ab8e-49e529aadb39',
        },
      });
      return res.data?.response || 'No response.';
    };

    try {
      const aiResponse = await askAI(query);

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: 'ARIA AI',
        headerSymbol: '🤖',
        headerStyle: 'bold',
        bodyText: aiResponse,
        bodyStyle: 'sansSerif',
        footerText: 'Reply to continue the conversation',
      });

      let sentMessageID: string;

      await new Promise<void>((resolve) => {
        api.sendMessage(styledMessage, threadID, (err: any, info: any) => {
          sentMessageID = info?.messageID;
          resolve();
        }, messageID);
      });

      if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();

      const replyHandler = async ({ api, event }: any) => {
        const { threadID: rThreadID, messageID: rMessageID, body, messageReply } = event;
        if (rThreadID !== threadID || !messageReply || messageReply.messageID !== sentMessageID) return;

        const followUp = body?.trim();
        if (!followUp) return;

        try {
          const nextResponse = await askAI(followUp);

          const nextStyled = AuroraBetaStyler.styleOutput({
            headerText: 'ARIA AI',
            headerSymbol: '🤖',
            headerStyle: 'bold',
            bodyText: nextResponse,
            bodyStyle: 'sansSerif',
            footerText: 'Reply to continue the conversation',
          });

          let newMessageID: string;

          await new Promise<void>((resolve) => {
        },
      });
      const geminiResponse = response.data.response || "No response from Gemini Vision API.";
      const message = `${geminiResponse}\n\nReply to this message to continue the conversation.`;

      let sentMessageID: string;
      await new Promise((resolve, reject) => {
        api.sendMessage(message, threadID, (err, messageInfo) => {
          if (err) {
            reject(err);
          } else {
            sentMessageID = messageInfo.messageID;
            resolve(messageInfo);
          }
        }, messageID);
      });

      if (!global.Kagenou.replyListeners) {
        global.Kagenou.replyListeners = new Map();
      }

      const handleReply = async (ctx: { api: any; event: any; data?: any }) => {
        const { api, event } = ctx;
        const { threadID, messageID } = event;
        const userReply = event.body?.trim() || "";

        try {
          const followUpResponse = await axios.get("https://kaiz-apis.gleeze.com/api/gemini-vision", {
            params: {
              q: userReply, // Changed from 'ask' to 'q'
              uid: senderID,
              apikey: "117cafc8-ef3b-4632-bc1c-13b38b912081",
              // imageUrl is omitted unless you want to add image support
            },
          });
          const newGeminiResponse = followUpResponse.data.response || "No response from Gemini Vision API.";
          const newMessage = `${newGeminiResponse}\n\nReply to this message to continue the conversation.`;

          let newSentMessageID: string;
          await new Promise((resolve, reject) => {
            api.sendMessage(newMessage, threadID, (err, newMessageInfo) => {
              if (err) {
                reject(err);
              } else {
                newSentMessageID = newMessageInfo.messageID;
                resolve(newMessageInfo);
              }
            }, messageID);
          });

          global.Kagenou.replyListeners.set(newSentMessageID, { callback: handleReply });
        } catch (error) {
          api.sendMessage("An error occurred while processing your reply with Gemini Vision API.", threadID, messageID);
        }
      };

      global.Kagenou.replyListeners.set(sentMessageID, { callback: handleReply });
    } catch (error) {
      api.sendMessage("An error occurred while contacting the Gemini Vision API.", threadID, messageID);
    }
  },
};

export default aiCommand;
