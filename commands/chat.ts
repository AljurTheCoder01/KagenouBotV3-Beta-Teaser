import { PollinationsAI } from "@gpt4free/g4f.dev";

const aiCommand: ShadowBot.Command = {
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
      api.sendTypingIndicator(threadID);
      const client = new PollinationsAI();
      const res = await client.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "user", content: prompt }],
      });
      const yasis =
        res?.choices?.[0]?.message?.content || "No res.";
      await api.sendMessage(yasis, threadID, messageID);
    } catch (error: any) {
      await api.sendMessage(
        `Error: ${error.message}`,
        threadID,
        messageID
      );
    }
  },
};

export default aiCommand;
