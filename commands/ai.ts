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

    const getImageUrl = (ev: any): string => {
      const attachments = ev.messageReply?.attachments || [];
      const img = attachments.find((a: any) => a.type === 'photo' || a.type === 'sticker' || a.type === 'animated_image' || a.type === 'video');
      return img?.url || img?.previewUrl || '';
    };

    const askAI = async (text: string, imageUrl: string = '') => {
      const res = await axios.get('https://rest-api-uacv.onrender.com/api/chipp-ai', {
        params: {
          ask: text,
          uid: senderID,
          imageUrl,
        },
      });
      return res.data?.response || res.data?.answer || res.data?.message || 'No response.';
    };

    const registerReply = (botMsgID: string) => {
      if (!global.Kagenou.replyListeners) global.Kagenou.replyListeners = new Map();

      global.Kagenou.replyListeners.set(botMsgID, {
        callback: async ({ api, event }: any) => {
          const { threadID: rThreadID, messageID: rMessageID, body } = event;
          if (rThreadID !== threadID) return;

          const followUp = body?.trim();
          if (!followUp) return;

          global.Kagenou.replyListeners.delete(botMsgID);

          const imageUrl = getImageUrl(event);

          try {
            const nextResponse = await askAI(followUp, imageUrl);

            const nextStyled = AuroraBetaStyler.styleOutput({
              headerText: 'CHIPP AI',
              headerSymbol: '🤖',
              headerStyle: 'bold',
              bodyText: nextResponse,
              bodyStyle: 'sansSerif',
              footerText: 'Reply to continue the conversation',
            });

            await new Promise<void>((resolve) => {
              api.sendMessage(nextStyled, rThreadID, (err: any, info: any) => {
                if (info?.messageID) registerReply(info.messageID);
                resolve();
              }, rMessageID);
            });
          } catch {
            await api.sendMessage(
              AuroraBetaStyler.styleOutput({
                headerText: 'Error',
                headerSymbol: '❌',
                headerStyle: 'bold',
                bodyText: 'Failed to process your message.',
                bodyStyle: 'sansSerif',
                footerText: 'Developed by: **Aljur Pogoy**',
              }),
              rThreadID,
              rMessageID
            );
          }
        },
      });
    };

    const imageUrl = getImageUrl(event);

    try {
      const aiResponse = await askAI(query, imageUrl);

      const styledMessage = AuroraBetaStyler.styleOutput({
        headerText: 'CHIPP AI',
        headerSymbol: '🤖',
        headerStyle: 'bold',
        bodyText: aiResponse,
        bodyStyle: 'sansSerif',
        footerText: 'Reply to continue the conversation',
      });

      await new Promise<void>((resolve) => {
        api.sendMessage(styledMessage, threadID, (err: any, info: any) => {
          if (info?.messageID) registerReply(info.messageID);
          resolve();
        }, messageID);
      });
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
