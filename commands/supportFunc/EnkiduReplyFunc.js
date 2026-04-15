"use strict";

const REPLY_TIMEOUT_MS = 30 * 60 * 1000;

function createReply(api, opts) {
  const {
    threadID,
    messageID,
    message,
    attachment,
    callback,
    data      = {},
    keepAlive = true,
    authorID  = null,
    onExpire  = null,
  } = opts;

  if (!threadID)  throw new Error("threadID is required.");
  if (!callback || typeof callback !== "function") throw new Error("Callback must be a function.");

  return new Promise((resolve, reject) => {
    api.sendMessage(
      { body: message || "", attachment },
      threadID,
      (err, info) => {
        if (err) return reject(err);

        const msgID = info?.messageID;
        if (!msgID) return reject(new Error("No messageID "));

        const entry = {
          callback,
          author:    authorID,
          data,
          keep:      keepAlive,
          expiresAt: Date.now() + REPLY_TIMEOUT_MS,
        };

        if (!global.replyListeners) global.replyListeners = new Map();
        global.replyListeners.set(msgID, entry);

        const timer = setTimeout(() => {
          if (global.replyListeners) global.replyListeners.delete(msgID);
          if (typeof onExpire === "function") {
            try { onExpire({ api, threadID, originalMessageID: msgID }); } catch (_) {}
          }
        }, REPLY_TIMEOUT_MS);

        if (timer.unref) timer.unref();

        resolve({ messageID: msgID, entry });
      },
      messageID || null
    );
  });
}

async function handleIncoming(api, event) {
  const repliedToID = event.messageReply?.messageID;
  if (!repliedToID) return false;

  if (!global.replyListeners) return false;
  const listener = global.replyListeners.get(repliedToID);
  if (!listener) return false;

  if (listener.expiresAt && Date.now() > listener.expiresAt) {
    global.replyListeners.delete(repliedToID);
    return false;
  }

  if (listener.author && String(event.senderID) !== String(listener.author)) {
    return true;
  }

  try {
    await listener.callback({
      api,
      event,
      attachments:       event.attachments || [],
      data:              listener.data      || {},
      originalMessageID: repliedToID,
      reply: (replyOpts) => createReply(api, {
        threadID:  event.threadID,
        messageID: event.messageID,
        keepAlive: true,
        authorID:  null,
        ...replyOpts,
      }),
      end: () => {
        global.replyListeners.delete(repliedToID);
      },
      refresh: (newData) => {
        const existing = global.replyListeners.get(repliedToID);
        if (existing) {
          existing.data       = { ...(existing.data || {}), ...newData };
          existing.expiresAt  = Date.now() + REPLY_TIMEOUT_MS;
          global.replyListeners.set(repliedToID, existing);
        }
      },
    });
  } catch (err) {
    global.log.error("[EnkiduReply] callback error: " + err.message);
    try {
      api.sendMessage(`Reply handler error: ${err.message}`, event.threadID, event.messageID);
    } catch (_) {}
  }

  if (!listener.keep) {
    global.replyListeners.delete(repliedToID);
  }

  return true;
}

function remove(messageID) {
  global.replyListeners.delete(messageID);
}

function has(messageID) {
  const l = global.replyListeners.get(messageID);
  if (!l) return false;
  if (l.expiresAt && Date.now() > l.expiresAt) {
    global.replyListeners.delete(messageID);
    return false;
  }
  return true;
}

module.exports = { createReply, handleIncoming, remove, has, REPLY_TIMEOUT_MS };
