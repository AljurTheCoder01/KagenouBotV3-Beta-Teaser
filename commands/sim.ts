import AuroraBetaStyler from '@aurora/styler';

const simCommand: ShadowBot.Command = {
  config: {
    author: 'aljurx',
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
        await simCollection.updateOne(
          { trigger },
          { $set: { trigger, response } },
          { upsert: true }
        );

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
      } catch {
        return api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: 'Sim Teach',
            headerSymbol: '❌',
            headerStyle: 'bold',
            bodyText: 'Failed to save trigger to database.',
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
        if (message.toLowerCase().includes(entry.trigger.toLowerCase())) {
          await api.sendMessage(entry.response, threadID, messageID);
          return;
        }
      }
    } catch {
      return;
    }
  },
};

export default simCommand;
