const fs = require("fs");

module.exports = {
    name: "ara",
    author: "VanHung & aljur pogoy",
    description: "Plays 'Yamete' sound when triggered.",
    nonPrefix: true,
    async run({ api, event }) {
        const { threadID, messageID, body } = event;
        if (/^ara/i.test(body)) {
            const audioPath = `${__dirname}/cache/ara.mp3`;
            if (!fs.existsSync(audioPath)) {
                return api.sendMessage("❌ Audio file not found!", threadID, messageID);
            }
            api.sendMessage({
                attachment: fs.createReadStream(audioPath)
            }, threadID, messageID);

        }

    }

};
