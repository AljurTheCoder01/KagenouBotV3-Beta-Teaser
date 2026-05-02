module.exports = {
  config: {
    name: "ping",
    aliases: ["p"],
    version: "1.0.0",
    author: "Aljurx",
    countDown: 3,
    role: 0,
    shortDescription: { en: "Check latency" },
    longDescription: { en: "Pings the bot." },
    category: "info",
    guide: { en: "{pn}ping" },
  },

  onStart: async ({ api, event, args, message, getLang, usersData, threadsData, prefix }) => {
    const info = await message.reply("🏓 Pong!");
  },
  onReply: async ({ api, event, message, Reply }) => {
    await message.reply("You replied! Reply data: " + JSON.stringify(Reply));
  }, 
  onReaction: async ({ api, event, message, Reaction }) => {
    await message.reply(`You reacted with ${event.reaction}!`);
  },
};
