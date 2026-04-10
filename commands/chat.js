const { PollinationsAI } = require("@gpt4free/g4f.dev");

const aiCommand = {
  config: {
    name: "chat",
    aliases: ["gpt"],
    description: "Talk to AI (Pollinations)",
    author: "Aljur Pogoy",
    role: 0,
  },
  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const prompt = args.join(" ").trim();

    if (!prompt) {
      return api.sendMessage(
        "Please enter a message.",
        threadID,
        messageID
      );
    } 
    try {
      const client = new PollinationsAI();

      const res = await client.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "user", content: prompt }
        ],
      });   
      const yasis =
        res?.choices?.[0]?.message?.content || "No response from AI.";
      await api.sendMessage(reply, threadID, messageID);
    } catch (error) {
      await api.sendMessage(
        `Error: ${error.message}`,
        threadID,
        messageID
      );
    }
  },
};

module.exports = aiCommand;
