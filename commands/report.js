const path = require("path");
const moment = require("moment-timezone");
const AuroraBetaStyler = require(path.join(__dirname, "..", "core", "plugins", "aurora-beta-styler"));
module.exports = {
  name: "report",
  description: "Report an issue to admins, moderators, or developers",
  author: "Aljur Pogoy",
  role: 0,
  async run({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const reportThreadID = "1209773028031961";
    const styledMessage = (header, body, symbol) => AuroraBetaStyler.styleOutput({
      headerText: header,
      headerSymbol: symbol,
      headerStyle: "bold",
      bodyText: body,
      bodyStyle: "sansSerif",
      footerText: "Developed by: **Aljur Pogoy**"
    });
    if (!args[0] || !["admins", "moderators", "developers"].includes(args[0].toLowerCase())) {
      await api.sendMessage(styledMessage("Error", "Please specify a valid target (admins, moderators, developers). Usage: /report <target> <message>", "❌"), threadID, messageID);
      await api.setMessageReaction("❌", messageID, () => {});
      return;
    }
    if (!args[1]) {
      await api.sendMessage(styledMessage("Error", "Please provide a report message. Usage: /report <target> <message>", "❌"), threadID, messageID);
      await api.setMessageReaction("❌", messageID, () => {});
      return;
    }
    const target = args[0].toLowerCase();
    const reportMessage = args.slice(1).join(" ");
    try {
      const userInfo = await api.getUserInfo([senderID]);
      const userName = userInfo[senderID]?.name || "Unknown User";
      const timestamp = moment().tz("Asia/Manila").format("MMMM D, YYYY [at] h:mm A");
      const reportBody = `Reports From: ${userName}\n\nReport: ${reportMessage}\n\nTimestamp: ${timestamp}\n\nReply to this message to respond to the user!`;
      let sentMessageID;
      await new Promise((resolve, reject) => {
        api.sendMessage(styledMessage("Report", reportBody, "🚨"), reportThreadID, (err, messageInfo) => {
          if (err) {
            console.error("Error sending report:", err);
            reject(err);
          }
          sentMessageID = messageInfo?.messageID;
          resolve(messageInfo);
        });
      });
      if (!sentMessageID) throw new Error("Failed to capture report message ID");
      await api.sendMessage(styledMessage("Report Sent", `Your report has been sent to ${target}!`, "✅"), threadID, messageID);
      if (!global.Kagenou.replies) global.Kagenou.replies = {};
      const handleReply = async ({ api, event }) => {
        const { threadID: replyThreadID, messageID: replyMessageID, body, messageReply, senderID: replySenderID } = event;
        if (replyThreadID !== reportThreadID || !messageReply || messageReply.messageID !== sentMessageID) return;
        const replyText = body?.trim() || "No response provided.";
        const replyUserInfo = await api.getUserInfo([replySenderID]);
        const replyUserName = replyUserInfo[replySenderID]?.name || "Unknown";
        const responseBody = `Response from ${replyUserName} (${target}):\n\n${replyText}\nReply to this message to continue the conversation.`;
        let newSentMessageID;
        await new Promise((resolve, reject) => {
          api.sendMessage(styledMessage("Response", responseBody, "📩"), threadID, (err, messageInfo) => {
            if (err) {
              console.error("Error sending response:", err);
              reject(err);
            }
            newSentMessageID = messageInfo?.messageID;
            resolve(messageInfo);
          }, messageID);
        });
        if (!newSentMessageID) throw new Error("Failed to capture response message ID");
        global.Kagenou.replies[newSentMessageID] = {
          callback: async ({ api, event }) => {
            const { threadID: userReplyThreadID, messageID: userReplyMessageID, body: userReply, messageReply: userMessageReply, senderID: userReplySenderID } = event;
            if (userReplyThreadID !== threadID || !userMessageReply || userMessageReply.messageID !== newSentMessageID || userReplySenderID !== senderID) return;
            const newReportBody = `Follow-up from ${userName}: ${userReply}\nTimestamp: ${moment().tz("Asia/Manila").format("MMMM D, YYYY [at] h:mm A")}\nReply to this message to respond to the user!`;
            let followUpMessageID;
            await new Promise((resolve, reject) => {
              api.sendMessage(styledMessage("Follow-up Report", newReportBody, "🚨"), reportThreadID, (err, messageInfo) => {
                if (err) {
                  console.error("Error sending follow-up report:", err);
                  reject(err);
                }
                followUpMessageID = messageInfo?.messageID;
                resolve(messageInfo);
              });
            });
            if (!followUpMessageID) throw new Error("Failed to capture follow-up message ID");
            global.Kagenou.replies[followUpMessageID] = { callback: handleReply };
            sentMessageID = followUpMessageID;
          },
          author: senderID
        };
      };
      global.Kagenou.replies[sentMessageID] = { callback: handleReply };
      console.log(`[REPORT] Registered reply handler for messageID: ${sentMessageID}`);
    } catch (error) {
      console.error("Error in report command:", error);
      await api.sendMessage(styledMessage("Error", `Failed to send report: ${error.message}`, "❌"), threadID, messageID);
      await api.setMessageReaction("❌", messageID, () => {});
    }
  }
};
