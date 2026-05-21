import AuroraBetaStyler from '@aurora/styler';

const simCommand: ShadowBot.Command = {
  config: {
    name: 'sim',
    description: 'Simulate auto-response triggers. Use "teach" to add new ones.',
    usage: 'sim teach <trigger> | <response>',
    nonPrefix: false,
  },

  run: async ({ api, event, args, db }) => {
    const { threadID, messageID } = event;
    if (!threadID || !messageID) return;

    const subCommand = args[0]?.toLowerCase();

    if (subCommand === 'teach') {
      const rest = args.slice(1).join(' ');
      const parts = rest.split('|');

      if (parts.length < 2) {
        return api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: 'Sim Teach',
            headerSymbol: '❌',
            headerStyle: 'bold',
            bodyText: 'Invalid format. Use:\n/sim teach <trigger> | <response>',
            bodyStyle: 'sansSerif',
            footerText: 'Developed by: **Aljur Pogoy**',
          }),
          threadID,
          messageID
        );
      }

      const trigger = parts[0].trim();
      const response = parts[1].trim();

      if (!trigger || !response) {
        return api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: 'Sim Teach',
            headerSymbol: '❌',
            headerStyle: 'bold',
            bodyText: 'Trigger and response cannot be empty.',
            bodyStyle: 'sansSerif',
            footerText: 'Developed by: **Aljur Pogoy**',
          }),
          threadID,
          messageID
        );
      }

      if (!db) {
        return api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: 'Sim Teach',
            headerSymbol: '❌',
            headerStyle: 'bold',
            bodyText: 'Database is not available.',
            bodyStyle: 'sansSerif',
            footerText: 'Developed by: **Aljur Pogoy**',
          }),
          threadID,
          messageID
        );
      }

      try {
        const simCollection = db.db('sim_collection');

        const existing = await simCollection.findOne({ trigger });

        if (existing) {
          const currentResponses: string[] = Array.isArray(existing.responses)
            ? existing.responses
            : [];

          if (currentResponses.includes(response)) {
            return api.sendMessage(
              AuroraBetaStyler.styleOutput({
                headerText: 'Sim Teach',
                headerSymbol: '⚠️',
                headerStyle: 'bold',
                bodyText: `That response already exists for "${trigger}".`,
                bodyStyle: 'sansSerif',
                footerText: 'Developed by: **Aljur Pogoy**',
              }),
              threadID,
              messageID
            );
          }

          const newResponses = [...currentResponses, response];

          await simCollection.deleteOne({ trigger });
          await simCollection.insertOne({ trigger, responses: newResponses });

          return api.sendMessage(
            AuroraBetaStyler.styleOutput({
              headerText: 'Sim Teach',
              headerSymbol: '✅',
              headerStyle: 'bold',
              bodyText: `New response added to "${trigger}"!`,
              bodyStyle: 'sansSerif',
              footerText: 'Developed by: **Aljur Pogoy**',
            }),
            threadID,
            messageID
          );
        }

        await simCollection.insertOne({ trigger, responses: [response] });

        return api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: 'Sim Teach',
            headerSymbol: '✅',
            headerStyle: 'bold',
            bodyText: `Trigger saved!\n\nTrigger: ${trigger}\nResponse: ${response}`,
            bodyStyle: 'sansSerif',
            footerText: '**Reminder**: Bad words are protected by profanity filter.',
          }),
          threadID,
          messageID
        );
      } catch (err: any) {
        console.error('[SIM] teach error:', err);
        return api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: 'Sim Teach',
            headerSymbol: '❌',
            headerStyle: 'bold',
            bodyText: `Error: ${err.message}`,
            bodyStyle: 'sansSerif',
            footerText: 'Developed by: **Aljur Pogoy**',
          }),
          threadID,
          messageID
        );
      }
    }

    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: 'Sim',
        headerSymbol: '🤖',
        headerStyle: 'bold',
        bodyText: 'Subcommands:\n• teach <trigger> | <response> — Add a new auto-response trigger',
        bodyStyle: 'sansSerif',
        footerText: 'Developed by: **Aljur Pogoy**',
      }),
      threadID,
      messageID
    );
  },

  handleEvent: async ({ api, event }) => {
    const { threadID, messageID, body } = event;
    if (!threadID || !messageID || !body) return;

    const message = body.trim();
    if (!message || !global.db) return;

    try {
      const simCollection = global.db.db('sim_collection');
      const all = await simCollection.find({}).toArray();

      for (const entry of all) {
        const escaped = entry.trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${escaped}$`, 'i');

        if (regex.test(message)) {
          const responses: string[] = Array.isArray(entry.responses)
            ? entry.responses
            : [];
          if (!responses.length) return;

          const picked = responses[Math.floor(Math.random() * responses.length)];
          await api.sendMessage(picked, threadID, messageID);
          return;
        }
      }
    } catch {
      return;
    }
  },
};

export default simCommand;
