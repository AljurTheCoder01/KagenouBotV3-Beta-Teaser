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
            api.sendMessage(nextStyled, threadID, (err: any, info: any) => {
              newMessageID = info?.messageID;
              resolve();
            }, rMessageID);
          });

          global.Kagenou.replyListeners.set(newMessageID, { callback: replyHandler });
          global.Kagenou.replyListeners.delete(sentMessageID);
          sentMessageID = newMessageID;
        } catch {
          await api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: 'eRROR',
              headerSymbol: '❌',
              headerStyle: 'bold',
              bodyText: 'Failed to process your message.',
              bodyStyle: 'sansSerif',
              footerText: 'Developed by: **Aljur Pogoy**',
            }),
            threadID,
            rMessageID
          );
        }
      };

      global.Kagenou.replyListeners.set(sentMessageID, { callback: replyHandler });
    } catch {
      await api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: 'AI ERROR',
          headerSymbol: '❌',
          headerStyle: 'bold',
          bodyText: 'Failed to contact AI.',
          bodyStyle: 'sansSerif',
          footerText: 'Developed by: **Aljur Pogoy**',
        }),
        threadID,
        messageID
      );
    }
  },
};

export default aiCommand;
