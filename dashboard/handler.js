/*
* @Notice: don't change anything on this code, or else dashboard will not run properly.
* @Author: Aljurx
*/

const path   = require("path");
const crypto = require("crypto");
const fs = require("fs-extra");

const sessions   = new Map();
const SESSION_TTL = 1000 * 60 * 60 * 6;

function createSession() {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL);
  return token;
}

function isValidSession(token) {
  if (!token || !sessions.has(token)) return false;
  if (Date.now() > sessions.get(token)) { sessions.delete(token); return false; }
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [t, exp] of sessions) if (now > exp) sessions.delete(t);
}, 3600000);

function checkAuth(req, res) {
  const token = req.headers["x-session-token"];
  if (!isValidSession(token)) {
    res.status(401).json({ ok: false, error: "Session expired. Please log in again." });
    return false;
  }
  return true;
}

async function sendToThreads(api, threadIDs, message) {
  const sent = [], failed = [];
  for (const tid of threadIDs) {
    try {
      await new Promise((resolve, reject) => {
        api.sendMessage(message, String(tid), (err) => err ? reject(err) : resolve());
      });
      sent.push(tid);
    } catch (err) {
      failed.push({ tid, reason: err.message });
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return { sent, failed };
}

module.exports = function mountDashboard(app) {
  const express = require("express");
  app.use(express.json());

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });
  app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  app.post("/login", (req, res) => {
    const { password } = req.body || {};
    const expected = process.env.DASHBOARD_PASSWORD || global.config?.dashboardPassword;
    if (!expected) return res.status(503).json({ ok: false, error: "No dashboardPassword set in config.json." });
    if (!password || password !== expected) return res.status(401).json({ ok: false, error: "Incorrect password." });
    const token = createSession();
    global.log.info("[DASHBOARD] New session created.");
    return res.json({ ok: true, token });
  });

  app.post("/logout", (req, res) => {
    const token = req.headers["x-session-token"];
    if (token) sessions.delete(token);
    return res.json({ ok: true });
  });

  app.get("/data/stats", (req, res) => {
    if (!checkAuth(req, res)) return;
    return res.json({
      ok:                true,
      botName:           global.config?.botName        || "Shadow Garden Bot",
      uptime:            process.uptime(),
      commands:          global.commands?.size          || 0,
      nonPrefixCommands: global.nonPrefixCommands?.size || 0,
      eventCommands:     global.eventCommands?.length   || 0,
      usersTracked:      global.usersData?.size         || 0,
      maintenanceMode:   global.maintenanceMode         || false,
      dbConnected:       !!global.db,
      prefix:            global.config?.Prefix?.[0]    || "/",
      topCommands:       (global.getUsageStats?.() || [])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
    });
  });

  app.get("/data/threads", async (req, res) => {
    if (!checkAuth(req, res)) return;
    const api = global.botApi;
    if (!api) return res.status(503).json({ ok: false, error: "Bot not connected yet." });
    try {
      const threadList = await api.getThreadList(30, null, ["INBOX"]);
      const groups = threadList
        .filter(t => t.isGroup && t.name && t.name !== t.threadID)
        .map(t => ({ threadID: t.threadID, name: t.name, memberCount: t.userInfo?.length || 0 }));
      return res.json({ ok: true, threads: groups });
    } catch (err) {
      global.log.error(`[DASHBOARD] getThreadList failed: ${err.message}`);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/data/message", async (req, res) => {
    if (!checkAuth(req, res)) return;
    const { threadIDs, message } = req.body || {};
    if (!Array.isArray(threadIDs) || !threadIDs.length || !message?.trim())
      return res.status(400).json({ ok: false, error: "threadIDs (array) and message are required." });
    const api = global.botApi;
    if (!api) return res.status(503).json({ ok: false, error: "Bot not connected yet." });
    const formatted = `❲ 👑 ❳ Message from Admin\n━━━━━━━━━━━━━━━━━━\n${message.trim()}\n\nFrom: ${global.config?.botName || "Shadow Garden Bot"} Dashboard`;
    const { sent, failed } = await sendToThreads(api, threadIDs, formatted);
    global.log.info(`[DASHBOARD] Message sent to ${sent.length} threads, failed: ${failed.length}.`);
    return res.json({ ok: true, sent: sent.length, failed: failed.length, failedList: failed });
  });

  app.post("/data/broadcast", async (req, res) => {
    if (!checkAuth(req, res)) return;
    const { message } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ ok: false, error: "message is required." });
    const api = global.botApi;
    if (!api) return res.status(503).json({ ok: false, error: "Bot not connected yet." });
    let threadList;
    try { threadList = await api.getThreadList(30, null, ["INBOX"]); }
    catch (err) { return res.status(500).json({ ok: false, error: "Failed to fetch thread list: " + err.message }); }
    const targets = threadList
      .filter(t => t.isGroup && t.name && t.name !== t.threadID)
      .map(t => t.threadID);
    const formatted = `❲ 👑 ❳ Broadcast from Admin\n━━━━━━━━━━━━━━━━━━\n${message.trim()}\n\nFrom: ${global.config?.botName || "Shadow Garden Bot"} Dashboard`;
    const { sent, failed } = await sendToThreads(api, targets, formatted);
    global.log.info(`[DASHBOARD] Broadcast: ${sent.length} sent, ${failed.length} failed.`);
    return res.json({ ok: true, sent: sent.length, failed: failed.length, total: targets.length });
  });

  app.post("/data/maintenance", (req, res) => {
    if (!checkAuth(req, res)) return;
    const { enabled } = req.body || {};
    if (typeof enabled !== "boolean") return res.status(400).json({ ok: false, error: "enabled must be true or false." });
    global.maintenanceMode = enabled;
    global.log.warn(`[DASHBOARD] Maintenance mode ${enabled ? "ON" : "OFF"}.`);
    return res.json({ ok: true, maintenanceMode: global.maintenanceMode });
  });

  app.post("/data/reload", (req, res) => {
    if (!checkAuth(req, res)) return;
    if (typeof global.reloadCommands !== "function")
      return res.status(503).json({ ok: false, error: "reloadCommands not available." });
    try {
      global.reloadCommands();
      global.log.success("[DASHBOARD] Commands reloaded.");
      return res.json({ ok: true, commands: global.commands?.size || 0, nonPrefixCommands: global.nonPrefixCommands?.size || 0, eventCommands: global.eventCommands?.length || 0 });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/data/banned", async (req, res) => {
    if (!checkAuth(req, res)) return;
    if (global.db) {
      try {
        const banned = await global.db.db("bannedUsers").find({}).toArray();
        return res.json({ ok: true, banned });
      } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
    }
    const p = path.join(__dirname, "../database/bannedUsers.json");
    try {
      const raw = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
      return res.json({ ok: true, banned: Object.entries(raw).map(([userId, info]) => ({ userId, ...info })) });
    } catch { return res.json({ ok: true, banned: [] }); }
  });

  app.delete("/data/banned/:userID", async (req, res) => {
    if (!checkAuth(req, res)) return;
    const { userID } = req.params;
    if (global.db) {
      try {
        await global.db.db("bannedUsers").deleteOne({ userId: userID });
        global.log.info(`[DASHBOARD] User ${userID} unbanned.`);
        return res.json({ ok: true });
      } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
    }
    const p = path.join(__dirname, "../database/bannedUsers.json");
    try {
      const raw = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
      delete raw[userID];
      fs.writeFileSync(p, JSON.stringify(raw, null, 2));
      return res.json({ ok: true });
    } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
  });

  global.log.success("[DASHBOARD] Admin dashboard mounted at / and /admin");

  const guestSessions = new Map();
  const GUEST_TTL     = 1000 * 60 * 60 * 3;

  function createGuestSession(uid) {
    for (const [tok, d] of guestSessions) if (d.uid === uid) guestSessions.delete(tok);
    const token = crypto.randomBytes(24).toString("hex");
    guestSessions.set(token, { uid, expiry: Date.now() + GUEST_TTL });
    return token;
  }

  function getGuestSession(token) {
    if (!token || !guestSessions.has(token)) return null;
    const s = guestSessions.get(token);
    if (Date.now() > s.expiry) { guestSessions.delete(token); return null; }
    return s;
  }

  setInterval(() => {
    const now = Date.now();
    for (const [t, s] of guestSessions) if (now > s.expiry) guestSessions.delete(t);
  }, 3600000);

  function streamToDataURL(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data",  c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      stream.on("error", reject);
      stream.on("end", () => {
        const buf  = Buffer.concat(chunks);
        const mime = detectMime(buf);
        resolve({ dataUrl: "data:" + mime + ";base64," + buf.toString("base64"), mime, size: buf.length });
      });
    });
  }

  function detectMime(buf) {
    if (!buf || buf.length < 12) return "application/octet-stream";
    const h = buf.slice(0, 12);
    
    if (h[0]===0xFF && h[1]===0xD8 && h[2]===0xFF) return "image/jpeg";
    if (h[0]===0x89 && h[1]===0x50 && h[2]===0x4E && h[3]===0x47) return "image/png";
    if (h[0]===0x47 && h[1]===0x49 && h[2]===0x46) return "image/gif";
    if (h[0]===0x52 && h[1]===0x49 && h[2]===0x46 && h[3]===0x41) return "image/webp";
    
    if (h[4]===0x66 && h[5]===0x74 && h[6]===0x79 && h[7]===0x70) return "video/mp4";
    if (h[4]===0x6D && h[5]===0x6F && (h[6]===0x6F || h[6]===0x64)) return "video/mp4";
    if (h[0]===0x1A && h[1]===0x45 && h[2]===0xDF && h[3]===0xA3) return "video/webm";
    
    if (h[0]===0x49 && h[1]===0x44 && h[2]===0x33) return "audio/mp3";          
    if (h[0]===0xFF && (h[1]&0xE0)===0xE0) return "audio/mp3";                   
    if (h[0]===0x4F && h[1]===0x67 && h[2]===0x67 && h[3]===0x53) return "audio/ogg"; 
    if (h[0]===0x52 && h[1]===0x49 && h[2]===0x46 && h[3]===0x46 && h[8]===0x57 && h[9]===0x41 && h[10]===0x56 && h[11]===0x45) return "audio/wav";
    if (h[4]===0x66 && h[5]===0x74 && h[6]===0x79 && h[7]===0x70 && h[8]===0x4D && h[9]===0x34) return "audio/m4a"; 
    return "application/octet-stream";
  }

  function getMimeFromFilename(filename) {
    if (!filename) return null;
    const ext = String(filename).split('.').pop().toLowerCase();
    const map = {
      mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
      mp3: 'audio/mp3', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/m4a', aac: 'audio/aac', flac: 'audio/flac',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    };
    return map[ext] || null;
  }

  async function serializeAttachment(a) {
    if (!a) return null;
    try {
      if (a && typeof a === "object" && typeof a.then === "function") {
        a = await a;
      }
      if (!a) return null;

      const hintMime = (a && typeof a === "object")
        ? (getMimeFromFilename(a.filename) || getMimeFromFilename(a.name) || a.mimetype || a.type || null)
        : null;

      if (a && typeof a === "object" && typeof a.stream?.pipe === "function") {
        const r = await streamToDataURL(a.stream);
        const finalMime = hintMime || r.mime;
        return { kind: "media", mime: finalMime, dataUrl: "data:" + finalMime + ";base64," + r.dataUrl.split(",")[1], size: r.size };
      }

      if (typeof a.pipe === "function") {
        const r = await streamToDataURL(a);
        const finalMime = hintMime || r.mime;
        return { kind: "media", mime: finalMime, dataUrl: "data:" + finalMime + ";base64," + r.dataUrl.split(",")[1], size: r.size };
      }

      if (Buffer.isBuffer(a)) {
        const detectedMime = detectMime(a);
        const finalMime = hintMime || detectedMime;
        return { kind: "media", mime: finalMime, dataUrl: "data:" + finalMime + ";base64," + a.toString("base64"), size: a.length };
      }

      if (typeof a === "string" && (a.startsWith("http://") || a.startsWith("https://"))) {
        return { kind: "url", url: a };
      }

      if (typeof a === "object") {
        if (a.url)  return { kind: "url",  url: a.url };
        if (a.path) {
          const buf = fs.readFileSync(a.path);
          const detectedMime = hintMime || getMimeFromFilename(a.path) || detectMime(buf);
          return { kind: "media", mime: detectedMime, dataUrl: "data:" + detectedMime + ";base64," + buf.toString("base64"), size: buf.length };
        }
        return { kind: "object", data: JSON.stringify(a).slice(0, 200) };
      }

      return { kind: "unknown", raw: String(a).slice(0, 100) };
    } catch (err) {
      return { kind: "error", error: err.message };
    }
  }

  function createVirtualApi(uid, responseBuffer) {
    const VIRTUAL_THREAD = "guest_" + uid;

    function resolveAttachments(raw) {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (raw.stream && typeof raw.stream.pipe === "function") return [raw.stream];
      return [raw];
    }

    return {
      async sendMessage(data, threadID, arg3, arg4) {
        let callback     = null;
        let replyToMsgID = null;
        if (typeof arg3 === "function") {
          callback     = arg3;
          replyToMsgID = arg4 || null;
        } else if (typeof arg3 === "string") {
          replyToMsgID = arg3;
        }

        let body = "", rawAttachments = [];
        if (typeof data === "string") {
          body = data;
        } else if (data && typeof data === "object") {
          body           = data.body || data.message || "";
          rawAttachments = resolveAttachments(data.attachment);
        }

        const attachments = await Promise.all(rawAttachments.map(serializeAttachment));
        const fakeInfo = {
          threadID:  VIRTUAL_THREAD,
          messageID: "vmsg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        };
        const msgEntry = {
          type:        "message",
          body:        body.trim(),
          attachments: attachments.filter(Boolean),
          timestamp:   Date.now(),
          messageID:   fakeInfo.messageID,
        };

        if (typeof callback === "function") {
          if (!global._guestReplyListeners) global._guestReplyListeners = new Map();

          callback(null, fakeInfo);

          if (global.Kagenou?.replies?.[fakeInfo.messageID]) {
            const registeredReply = global.Kagenou.replies[fakeInfo.messageID];
            global._guestReplyListeners.set(fakeInfo.messageID, {
              callback: registeredReply.callback,
              author:   registeredReply.author,
              expiresAt: Date.now() + 30 * 60 * 1000,
              uid,
              oneShot: true,
            });
            delete global.Kagenou.replies[fakeInfo.messageID];
          }
        }

        responseBuffer.push(msgEntry);
        return fakeInfo;
      },

      setMessageReaction(reaction, messageID, callback) {
        if (typeof callback === "function") callback(null);
      },
      sendTypingIndicator(threadID, callback) {
        if (typeof callback === "function") callback(null, () => {});
        return () => {};
      },
      async getUserInfo(userID) {
        if (global.botApi && global.botApi.getUserInfo) {
          try {
            return await new Promise((res, rej) =>
              global.botApi.getUserInfo(userID, (err, d) => err ? rej(err) : res(d))
            );
          } catch (e) {}
        }
        const id = Array.isArray(userID) ? userID[0] : userID;
        return { [id]: { name: "User " + id, vanity: "", thumbSrc: "" } };
      },
      async getThreadInfo(tid) {
        return { threadID: tid, name: "Guest Dashboard", isGroup: false, userInfo: [] };
      },
      async getThreadList(limit, timestamp, tags) {
        return (global.botApi && global.botApi.getThreadList)
          ? global.botApi.getThreadList(limit, timestamp, tags)
          : [];
      },
      getCurrentUserID() { return (global.botApi && global.botApi.getCurrentUserID) ? global.botApi.getCurrentUserID() : "0"; },
      changeNickname(n, t, p, cb) { if (typeof cb === "function") cb(null); return Promise.resolve(); },
      unsendMessage(messageID, cb) { if (typeof cb === "function") cb(null); return Promise.resolve(); },
      markAsRead(threadID, cb)     { if (typeof cb === "function") cb(null); },
      listenMqtt()  { return { stopListening: () => {} }; },
      setOptions()  {},
    };
  }

  function getGuestUserRole(uid) {
    uid = String(uid);
    if (!global.config) return 0;
    const developers = (global.config.developers || []).map(String);
    const moderators = (global.config.moderators || []).map(String);
    const admins     = (global.config.admins     || []).map(String);
    const vips       = (global.config.vips        || []).map(String);
    if (developers.includes(uid)) return 4;
    if (vips.includes(uid))       return 3;
    if (moderators.includes(uid)) return 2;
    if (admins.includes(uid))     return 1;
    return 0;
  }

  function buildFakeReplyEvent(uid, replyToMessageID, newInput) {
    return {
      type:         "message_reply",
      threadID:     "guest_" + uid,
      senderID:     String(uid),
      messageID:    "vmsg_reply_" + Date.now(),
      body:         newInput,
      attachments:  [],
      timestamp:    Date.now(),
      isGroup:      false,
      messageReply: { messageID: replyToMessageID },
    };
  }

  async function handleGuestReply(uid, replyToMessageID, newInput, responseBuffer, vApi) {

    if (global._guestReplyListeners && global._guestReplyListeners.has(replyToMessageID)) {
      const listenerData = global._guestReplyListeners.get(replyToMessageID);

      if (listenerData.expiresAt && Date.now() > listenerData.expiresAt) {
        global._guestReplyListeners.delete(replyToMessageID);
        responseBuffer.push({ type: "message", body: "⏰ This reply has expired.", attachments: [], timestamp: Date.now() });
        return true;
      }

      if (listenerData.author && String(uid) !== String(listenerData.author)) {
        responseBuffer.push({ type: "message", body: "Only the original sender can reply to this message.", attachments: [], timestamp: Date.now() });
        return true;
      }

      const fakeReplyEvent = buildFakeReplyEvent(uid, replyToMessageID, newInput);
      try {
        await listenerData.callback({
          ...fakeReplyEvent,
          event:             fakeReplyEvent,
          api:               vApi,
          attachments:       [],
          data:              listenerData,
          originalMessageID: replyToMessageID,
        });
        if (listenerData.oneShot !== false) {
          global._guestReplyListeners.delete(replyToMessageID);
        }
      } catch (err) {
        responseBuffer.push({ type: "message", body: "⚠️ Reply error: " + err.message, attachments: [], timestamp: Date.now() });
      }
      return true;
    }

    if (global.replyListeners && global.replyListeners.has(replyToMessageID)) {
      const replyData = global.replyListeners.get(replyToMessageID);
      if (replyData.expiresAt && Date.now() > replyData.expiresAt) {
        global.replyListeners.delete(replyToMessageID);
        responseBuffer.push({ type: "message", body: "⏰ This reply has expired.", attachments: [], timestamp: Date.now() });
        return true;
      }
      const fakeReplyEvent = buildFakeReplyEvent(uid, replyToMessageID, newInput);
      try {
        await replyData.callback({
          ...fakeReplyEvent,
          event:             fakeReplyEvent,
          api:               vApi,
          attachments:       [],
          data:              replyData.data || {},
          originalMessageID: replyToMessageID,
        });
      } catch (err) {
        responseBuffer.push({ type: "message", body: "⚠️ Reply error: " + err.message, attachments: [], timestamp: Date.now() });
      }
      return true;
    }

    if (global.Kagenou?.replyListeners?.has(replyToMessageID)) {
      const listenerData = global.Kagenou.replyListeners.get(replyToMessageID);
      const fakeReplyEvent = buildFakeReplyEvent(uid, replyToMessageID, newInput);
      try {
        await listenerData.callback({
          ...fakeReplyEvent,
          event:             fakeReplyEvent,
          api:               vApi,
          attachments:       [],
          data:              { senderID: String(uid), threadID: "guest_" + uid, messageID: fakeReplyEvent.messageID },
        });
        global.Kagenou.replyListeners.delete(replyToMessageID);
      } catch (err) {
        responseBuffer.push({ type: "message", body: "⚠️ Reply error: " + err.message, attachments: [], timestamp: Date.now() });
      }
      return true;
    }

    if (global.Kagenou?.replies?.[replyToMessageID]) {
      const replyData = global.Kagenou.replies[replyToMessageID];
      if (replyData.author && String(uid) !== String(replyData.author)) {
        responseBuffer.push({ type: "message", body: "Only the original sender can reply to this message.", attachments: [], timestamp: Date.now() });
        return true;
      }
      const fakeReplyEvent = buildFakeReplyEvent(uid, replyToMessageID, newInput);
      try {
        await replyData.callback({
          ...fakeReplyEvent,
          event:       fakeReplyEvent,
          api:         vApi,
          attachments: [],
          data:        replyData,
        });
      } catch (err) {
        responseBuffer.push({ type: "message", body: "⚠️ Reply error: " + err.message, attachments: [], timestamp: Date.now() });
      }
      return true;
    }

    return false;
  }

  async function handleGuestReaction(uid, messageID, reaction) {
    const senderID = String(uid);

    if (!global.usersData.has(senderID)) {
      global.usersData.set(senderID, { messages: 0, reactions: 0 });
    }
    const userStats = global.usersData.get(senderID);
    userStats.reactions = (userStats.reactions || 0) + 1;
    global.usersData.set(senderID, userStats);

    if (global.db) {
      try {
        await global.db.db("users").updateOne(
          { userId: senderID },
          { $set: { userId: senderID, data: userStats } },
          { upsert: true }
        );
      } catch (err) {
        global.log.error(`[GUEST_REACTION] DB error for ${senderID}: ${err.message}`);
      }
    }

    if (!global.reactionData) global.reactionData = new Map();
    if (!global.reactionData.has(messageID)) {
      global.reactionData.set(messageID, { count: 0, users: new Set(), callback: null, authorID: null, threadID: "guest_" + uid });
    }
    const reactionInfo = global.reactionData.get(messageID);
    reactionInfo.count = (reactionInfo.count || 0) + 1;
    reactionInfo.users = reactionInfo.users || new Set();
    reactionInfo.users.add(senderID);
    global.reactionData.set(messageID, reactionInfo);

    if (reactionInfo.callback && typeof reactionInfo.callback === "function") {
      const responseBuffer = [];
      const vApi = createVirtualApi(uid, responseBuffer);

      try {
        const fakeReactionEvent = {
          type:      "message_reaction",
          threadID:  "guest_" + uid,
          senderID,
          messageID,
          reaction,
          timestamp: Date.now(),
        };
        await reactionInfo.callback({ api: vApi, event: fakeReactionEvent, reaction, threadID: "guest_" + uid, messageID, senderID });
        global.reactionData.delete(messageID);
        return { ok: true, responses: responseBuffer };
      } catch (err) {
        global.log.error(`[GUEST_REACTION] Callback error: ${err.message}`);
        return { ok: false, error: err.message, responses: [] };
      }
    }

    return { ok: true, responses: [] };
  }

  async function runGuestCommand(uid, input, replyToMessageID) {
    const prefix  = (global.config && global.config.Prefix && global.config.Prefix[0]) || "/";
    const trimmed = input.trim();
    const body    = trimmed.startsWith(prefix) ? trimmed : prefix + trimmed;
    const parts   = body.slice(prefix.length).trim().split(/\s+/);
    const cmdName = parts[0] ? parts[0].toLowerCase() : "";
    const args    = parts.slice(1);

    const responseBuffer = [];
    const vApi           = createVirtualApi(uid, responseBuffer);

    if (replyToMessageID) {
      const handled = await handleGuestReply(uid, replyToMessageID, trimmed, responseBuffer, vApi);
      if (handled) {
        if (!responseBuffer.length) {
          responseBuffer.push({ type: "message", body: "(Reply processed but produced no output.)", attachments: [], timestamp: Date.now() });
        }
        return responseBuffer;
      }
      return [{ type: "message", body: "⚠️ This reply is no longer active or has expired.", attachments: [], timestamp: Date.now() }];
    }

    const command = (global.commands && global.commands.get(cmdName))
                 || (global.nonPrefixCommands && global.nonPrefixCommands.get(cmdName));

    if (!command) {
      return [{ type: "message", body: `Command "${cmdName}" not found. Use ${prefix}help to see available commands.`, attachments: [], timestamp: Date.now() }];
    }

    const userRole    = getGuestUserRole(uid);
    const commandRole = (command.config && command.config.role != null) ? command.config.role : (command.role != null ? command.role : 0);

    if (userRole < commandRole) {
      return [{ type: "message", body: `Permission denied. This command requires role ${commandRole} and your role is ${userRole}.`, attachments: [], timestamp: Date.now() }];
    }

    const fakeEvent = {
      type:         "message",
      threadID:     "guest_" + uid,
      senderID:     String(uid),
      messageID:    "vmsg_" + Date.now(),
      body,
      attachments:  [],
      timestamp:    Date.now(),
      isGroup:      false,
      messageReply: null,
    };

    const vSendMessage = async (api, msgData) => {
      const { message, attachment, threadID: tid, messageID: replyMsgID, replyHandler, senderID: authorID } = msgData;
      const fakeInfo = await vApi.sendMessage(
        { body: message || "", attachment },
        tid || ("guest_" + uid),
        replyMsgID || null
      );
      if (replyHandler && typeof replyHandler === "function" && fakeInfo?.messageID) {
        if (!global._guestReplyListeners) global._guestReplyListeners = new Map();
        global._guestReplyListeners.set(fakeInfo.messageID, {
          callback:  replyHandler,
          author:    authorID ? String(authorID) : String(uid),
          expiresAt: Date.now() + (global.config?.replyTimeout || 300) * 1000,
          uid,
          oneShot:   true,
        });
      }
      return fakeInfo;
    };

    try {
      if (global.trackUsage) global.trackUsage(cmdName);
      if (command.execute) {
        await command.execute(vApi, fakeEvent, args, global.commands, prefix, (global.config && global.config.admins) || [], global.appState, vSendMessage, global.usersData, global.globalData);
      } else if (command.run) {
        await command.run({ api: vApi, event: fakeEvent, args, attachments: [], usersData: global.usersData, globalData: global.globalData, admins: (global.config && global.config.admins) || [], prefix, db: global.db, commands: global.commands });
      }
    } catch (err) {
      responseBuffer.push({ type: "message", body: "Command error: " + err.message, attachments: [], timestamp: Date.now() });
    }

    if (!responseBuffer.length) {
      responseBuffer.push({ type: "message", body: "(Command ran but produced no output.)", attachments: [], timestamp: Date.now() });
    }
    return responseBuffer;
  }

  const GUEST_COLLECTION = "guestUsers";
  const guestAccounts = new Map();

  async function loadGuestAccounts() {
    if (!global.db) { global.log.warn("[GUEST] No DB connected — guest accounts unavailable."); return; }
    try {
      const all = await global.db.db(GUEST_COLLECTION).find({}).toArray();
      all.forEach(a => guestAccounts.set(String(a.uid), { passwordHash: a.passwordHash }));
      global.log.info("[GUEST] Loaded " + all.length + " guest accounts from MongoDB.");
    } catch (e) { global.log.error("[GUEST] Failed to load guest accounts: " + e.message); }
  }
  loadGuestAccounts();

  async function saveGuestAccount(uid, passwordHash) {
    guestAccounts.set(uid, { passwordHash });
    if (!global.db) throw new Error("No database connected.");
    await global.db.db(GUEST_COLLECTION).updateOne(
      { uid },
      { $set: { uid, passwordHash, createdAt: new Date() } },
      { upsert: true }
    );
  }

  async function getGuestAccount(uid) {
    if (guestAccounts.has(uid)) return guestAccounts.get(uid);
    if (!global.db) return null;
    try {
      const doc = await global.db.db(GUEST_COLLECTION).findOne({ uid });
      if (doc) {
        guestAccounts.set(uid, { passwordHash: doc.passwordHash });
        return { passwordHash: doc.passwordHash };
      }
    } catch (e) { global.log.error("[GUEST] DB lookup error: " + e.message); }
    return null;
  }

  function hashPassword(password) {
    return crypto.createHash("sha256").update(password + "sgbot_salt_2025").digest("hex");
  }

  app.post("/data/guests/reset", async (req, res) => {
    if (!checkAuth(req, res)) return;
    if (!global.db) return res.status(503).json({ ok: false, error: "Database not connected." });
    try {
      await global.db.db(GUEST_COLLECTION).deleteMany({});
      guestAccounts.clear();
      global.log.warn("[DASHBOARD] All guest accounts wiped and collection reset.");
      return res.json({ ok: true, message: "All guest accounts deleted. Fresh collection ready." });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get("/data/guests", async (req, res) => {
    if (!checkAuth(req, res)) return;
    if (!global.db) return res.status(503).json({ ok: false, error: "Database not connected." });
    try {
      const all = await global.db.db(GUEST_COLLECTION).find({}, { projection: { uid: 1, createdAt: 1, _id: 0 } }).toArray();
      return res.json({ ok: true, total: all.length, guests: all });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.delete("/data/guests/:uid", async (req, res) => {
    if (!checkAuth(req, res)) return;
    if (!global.db) return res.status(503).json({ ok: false, error: "Database not connected." });
    const { uid } = req.params;
    try {
      await global.db.db(GUEST_COLLECTION).deleteOne({ uid });
      guestAccounts.delete(uid);
      global.log.info("[DASHBOARD] Guest account deleted: " + uid);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get("/guest", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  app.post("/guest/register", async (req, res) => {
    if (!global.db) return res.status(503).json({ ok: false, error: "Database not connected." });
    const { uid, password } = req.body || {};
    if (!uid || !/^\d+$/.test(String(uid).trim()))
      return res.status(400).json({ ok: false, error: "Please enter a valid numeric Facebook UID." });
    if (!password || password.length < 6)
      return res.status(400).json({ ok: false, error: "Password must be at least 6 characters." });
    const cleanUid = String(uid).trim();
    const existing = await getGuestAccount(cleanUid);
    if (existing)
      return res.status(409).json({ ok: false, error: "This UID is already registered. Please log in.", exists: true });
    try {
      const passwordHash = hashPassword(password);
      await saveGuestAccount(cleanUid, passwordHash);
      global.log.info("[GUEST] New account registered for UID " + cleanUid + ".");
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: "Failed to save account: " + e.message });
    }
  });

  app.post("/guest/login", async (req, res) => {
    if (!global.db) return res.status(503).json({ ok: false, error: "Database not connected." });
    const { uid, password } = req.body || {};
    if (!uid || !/^\d+$/.test(String(uid).trim()))
      return res.status(400).json({ ok: false, error: "Please enter a valid numeric Facebook UID." });
    if (!password)
      return res.status(400).json({ ok: false, error: "Password is required." });
    const cleanUid = String(uid).trim();
    const account = await getGuestAccount(cleanUid);
    if (!account)
      return res.status(404).json({ ok: false, error: "UID not registered. Please create an account first.", notFound: true });
    if (account.passwordHash !== hashPassword(password))
      return res.status(401).json({ ok: false, error: "Incorrect password." });
    const token = createGuestSession(cleanUid);
    global.log.info("[GUEST] Session created for UID " + cleanUid + ".");
    return res.json({ ok: true, token, uid: cleanUid });
  });

  app.post("/guest/logout", (req, res) => {
    const tok = req.headers["x-guest-token"];
    if (tok) guestSessions.delete(tok);
    return res.json({ ok: true });
  });

  app.get("/guest/commands", (req, res) => {
    const tok     = req.headers["x-guest-token"];
    const session = getGuestSession(tok);
    if (!session) return res.status(401).json({ ok: false, error: "Not logged in." });
    const userRole = getGuestUserRole(session.uid);
    const prefix   = (global.config && global.config.Prefix && global.config.Prefix[0]) || "/";
    const seen     = new Set();
    const cmds     = [...((global.commands && global.commands.values()) || [])]
      .filter(c => {
        const n = (c.config && c.config.name) || c.name;
        if (seen.has(n)) return false;
        seen.add(n);
        const cmdRole = (c.config && c.config.role != null) ? c.config.role : (c.role != null ? c.role : 0);
        return userRole >= cmdRole;
      })
      .map(c => ({
        name:        (c.config && c.config.name) || c.name || "unknown",
        description: (c.config && c.config.description) || c.description || "",
        usage:       (c.config && c.config.usage) || (prefix + ((c.config && c.config.name) || c.name)),
        cooldown:    (c.config && c.config.cooldown != null) ? c.config.cooldown : (c.cooldown != null ? c.cooldown : 3),
        role:        (c.config && c.config.role != null) ? c.config.role : (c.role != null ? c.role : 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return res.json({ ok: true, commands: cmds, prefix, userRole });
  });

  app.post("/guest/run", async (req, res) => {
    const tok     = req.headers["x-guest-token"];
    const session = getGuestSession(tok);
    if (!session) return res.status(401).json({ ok: false, error: "Session expired. Please log in again." });
    const { input, replyTo } = req.body || {};
    if (!input || !input.trim()) return res.status(400).json({ ok: false, error: "input is required." });
    try {
      const responses = await runGuestCommand(session.uid, input, replyTo || null);
      return res.json({ ok: true, responses });
    } catch (err) {
      global.log.error("[GUEST] Error: " + err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/guest/react", async (req, res) => {
    const tok     = req.headers["x-guest-token"];
    const session = getGuestSession(tok);
    if (!session) return res.status(401).json({ ok: false, error: "Not logged in." });
    const { messageID, reaction } = req.body || {};
    if (!messageID || !reaction) return res.status(400).json({ ok: false, error: "messageID and reaction are required." });
    const VALID_REACTIONS = ['😢','👍','🤩','🗿','💝'];
    if (!VALID_REACTIONS.includes(reaction)) return res.status(400).json({ ok: false, error: "Invalid reaction." });
    try {
      const result = await handleGuestReaction(session.uid, messageID, reaction);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message, responses: [] });
    }
  });


  const MYDAY_TTL = 24 * 60 * 60 * 1000;
  const SOCIAL_REACTIONS = ['❤️','😂','😮','😢','😡','👍'];

  function guestAuth(req, res) {
    const tok = req.headers['x-guest-token'];
    const session = getGuestSession(tok);
    if (!session) { res.status(401).json({ ok: false, error: 'Not logged in.' }); return null; }
    return session;
  }

  function dbRequired(res) {
    if (!global.db) { res.status(503).json({ ok: false, error: 'Database not connected.' }); return false; }
    return true;
  }

  function newId() { return crypto.randomBytes(12).toString('hex'); }

  async function getProfile(uid) {
    const doc = await global.db.db('guestUsers').findOne({ uid });
    return {
      uid,
      displayName: doc?.displayName || ('User ' + uid.slice(-6)),
      bio:         doc?.bio         || '',
      avatar:      doc?.avatar      || null,
      locked:      doc?.locked      || false,
      createdAt:   doc?.createdAt   || null,
    };
  }

  app.get('/social/profile/:uid', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    const { uid } = req.params;
    const isSelf = session.uid === uid;
    try {
      const profile = await getProfile(uid);
      const userRole = getGuestUserRole(uid);
      const now = Date.now();
      const mydays = await global.db.db('mydays').find({ uid, expiresAt: { $gt: now } }).sort({ createdAt: -1 }).toArray();
      if (profile.locked && !isSelf) {
        return res.json({ ok: true, profile, userRole, mydays, posts: [], locked: true, isSelf });
      }
      const posts = await global.db.db('posts').find({ uid }).sort({ createdAt: -1 }).limit(20).toArray();
      const statsDoc = await global.db.db('guestUsers').findOne({ uid }, { projection: { data: 1 } });
      return res.json({ ok: true, profile, userRole, mydays, posts, stats: statsDoc?.data || {}, locked: false, isSelf });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.patch('/social/profile', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    const { displayName, bio, avatar, locked } = req.body || {};
    const update = {};
    if (displayName !== undefined) update.displayName = String(displayName).slice(0, 40);
    if (bio !== undefined)         update.bio         = String(bio).slice(0, 200);
    if (avatar !== undefined)      update.avatar      = avatar;
    if (locked  !== undefined)     update.locked      = !!locked;
    try {
      await global.db.db('guestUsers').updateOne({ uid: session.uid }, { $set: update }, { upsert: true });
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.get('/social/search', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    const { q } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ ok: false, error: 'Query required.' });
    try {
      const doc = await global.db.db('guestUsers').findOne({ uid: q.trim() });
      if (!doc) return res.json({ ok: false, error: 'User not found.' });
      const profile = await getProfile(q.trim());
      return res.json({ ok: true, profile });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.post('/social/myday', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    const { mediaData, mediaType, caption } = req.body || {};
    if (!mediaData) return res.status(400).json({ ok: false, error: 'mediaData is required.' });
    if (!['image','video'].includes(mediaType)) return res.status(400).json({ ok: false, error: 'mediaType must be image or video.' });
    const sizeBytes = Buffer.byteLength(mediaData, 'base64');
    if (sizeBytes > 5 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'File too large. Max 5MB.' });
    try {
      const id = newId();
      const now = Date.now();
      await global.db.db('mydays').insertOne({
        id, uid: session.uid, mediaData, mediaType,
        caption: (caption || '').slice(0, 200),
        reactions: {}, createdAt: now, expiresAt: now + MYDAY_TTL,
      });
      return res.json({ ok: true, id });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.delete('/social/myday/:id', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    try {
      await global.db.db('mydays').deleteOne({ id: req.params.id, uid: session.uid });
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.post('/social/myday/:id/react', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    const { reaction } = req.body || {};
    if (!SOCIAL_REACTIONS.includes(reaction)) return res.status(400).json({ ok: false, error: 'Invalid reaction.' });
    try {
      const doc = await global.db.db('mydays').findOne({ id: req.params.id });
      if (!doc) return res.status(404).json({ ok: false, error: 'MyDay not found.' });
      const reactions = doc.reactions || {};
      const prev = reactions[session.uid];
      if (prev === reaction) { delete reactions[session.uid]; } else { reactions[session.uid] = reaction; }
      await global.db.db('mydays').updateOne({ id: req.params.id }, { $set: { reactions } });
      return res.json({ ok: true, reactions });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.post('/social/post', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    const { content, mediaData, mediaType } = req.body || {};
    if (!content?.trim() && !mediaData) return res.status(400).json({ ok: false, error: 'Post needs content or media.' });
    if (mediaData && Buffer.byteLength(mediaData, 'base64') > 5 * 1024 * 1024)
      return res.status(413).json({ ok: false, error: 'File too large. Max 5MB.' });
    try {
      const id = newId();
      await global.db.db('posts').insertOne({
        id, uid: session.uid,
        content: (content || '').slice(0, 1000),
        mediaData: mediaData || null, mediaType: mediaType || null,
        reactions: {}, commentCount: 0, createdAt: Date.now(),
      });
      return res.json({ ok: true, id });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.get('/social/feed', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    try {
      const posts = await global.db.db('posts').find({}).sort({ createdAt: -1 }).limit(20).toArray();
      const profiles = {};
      for (const p of posts) if (!profiles[p.uid]) profiles[p.uid] = await getProfile(p.uid);
      return res.json({ ok: true, posts, profiles });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.get('/social/post/:id', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    try {
      const post = await global.db.db('posts').findOne({ id: req.params.id });
      if (!post) return res.status(404).json({ ok: false, error: 'Post not found.' });
      const profile = await getProfile(post.uid);
      const comments = await global.db.db('comments').find({ postId: req.params.id, parentId: null }).sort({ createdAt: 1 }).toArray();
      const commentProfiles = {};
      for (const c of comments) {
        if (!commentProfiles[c.uid]) commentProfiles[c.uid] = await getProfile(c.uid);
        const replies = await global.db.db('comments').find({ postId: req.params.id, parentId: c.id }).sort({ createdAt: 1 }).toArray();
        for (const r of replies) if (!commentProfiles[r.uid]) commentProfiles[r.uid] = await getProfile(r.uid);
        c.replies = replies;
      }
      return res.json({ ok: true, post, profile, comments, commentProfiles });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.delete('/social/post/:id', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    try {
      await global.db.db('posts').deleteOne({ id: req.params.id, uid: session.uid });
      await global.db.db('comments').deleteMany({ postId: req.params.id });
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.post('/social/post/:id/react', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    const { reaction } = req.body || {};
    if (!SOCIAL_REACTIONS.includes(reaction)) return res.status(400).json({ ok: false, error: 'Invalid reaction.' });
    try {
      const doc = await global.db.db('posts').findOne({ id: req.params.id });
      if (!doc) return res.status(404).json({ ok: false, error: 'Post not found.' });
      const reactions = doc.reactions || {};
      const prev = reactions[session.uid];
      if (prev === reaction) { delete reactions[session.uid]; } else { reactions[session.uid] = reaction; }
      await global.db.db('posts').updateOne({ id: req.params.id }, { $set: { reactions } });
      return res.json({ ok: true, reactions });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.post('/social/post/:id/comment', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    const { text, parentId } = req.body || {};
    if (!text?.trim()) return res.status(400).json({ ok: false, error: 'Comment text required.' });
    try {
      const id = newId();
      const comment = {
        id, postId: req.params.id, uid: session.uid,
        text: text.slice(0, 500),
        parentId: parentId || null,
        reactions: {}, createdAt: Date.now(),
      };
      await global.db.db('comments').insertOne(comment);
      await global.db.db('posts').updateOne({ id: req.params.id }, { $inc: { commentCount: 1 } });
      const profile = await getProfile(session.uid);
      return res.json({ ok: true, comment, profile });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.post('/social/comment/:id/react', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    const { reaction } = req.body || {};
    if (!SOCIAL_REACTIONS.includes(reaction)) return res.status(400).json({ ok: false, error: 'Invalid reaction.' });
    try {
      const doc = await global.db.db('comments').findOne({ id: req.params.id });
      if (!doc) return res.status(404).json({ ok: false, error: 'Comment not found.' });
      const reactions = doc.reactions || {};
      const prev = reactions[session.uid];
      if (prev === reaction) { delete reactions[session.uid]; } else { reactions[session.uid] = reaction; }
      await global.db.db('comments').updateOne({ id: req.params.id }, { $set: { reactions } });
      return res.json({ ok: true, reactions });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  app.delete('/social/comment/:id', async (req, res) => {
    const session = guestAuth(req, res); if (!session) return;
    if (!dbRequired(res)) return;
    try {
      const doc = await global.db.db('comments').findOne({ id: req.params.id, uid: session.uid });
      if (!doc) return res.status(404).json({ ok: false, error: 'Comment not found or not yours.' });
      await global.db.db('comments').deleteOne({ id: req.params.id });
      await global.db.db('comments').deleteMany({ parentId: req.params.id });
      await global.db.db('posts').updateOne({ id: doc.postId }, { $inc: { commentCount: -1 } });
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  });

  setInterval(async () => {
    if (!global.db) return;
    try { await global.db.db('mydays').deleteMany({ expiresAt: { $lt: Date.now() } }); }
    catch (e) { global.log.error('[MYDAY] Cleanup error: ' + e.message); }
  }, 60 * 60 * 1000);

  global.log.success("[GUEST] Guest mode mounted at /guest");
};
