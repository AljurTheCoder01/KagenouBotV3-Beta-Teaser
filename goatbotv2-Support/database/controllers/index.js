
"use strict";

const path = require("path");
const fs   = require("fs-extra");

class UsersData {
  /** @private */
  _col() {
    return global.db ? global.db.db("users") : null;
  }
  async get(userID) {
    userID = String(userID);
    if (global.usersData.has(userID)) {
      return { userID, data: global.usersData.get(userID) };
    }
    const col = this._col();
    if (col) {
      const doc = await col.findOne({ userId: userID });
      if (doc) {
        global.usersData.set(userID, doc.data || {});
        return doc;
      }
    }
    const fresh = { userID, data: { balance: 0, bank: 0, xp: 0, level: 0, exp: 0 } };
    await this.create(userID);
    return fresh;
  }

  /**
   * @returns {Promise<Array>}
   */
  async getAll() {
    const col = this._col();
    if (col) return col.find({}).toArray();
    return [...global.usersData.entries()].map(([userID, data]) => ({ userID, data }));
  }

  async create(userID, userInfo = {}) {
    userID = String(userID);
    const data = { balance: 0, bank: 0, xp: 0, level: 0, exp: 0, ...userInfo };
    global.usersData.set(userID, data);
    const col = this._col();
    if (col) {
      await col.updateOne(
        { userId: userID },
        { $setOnInsert: { userId: userID, data } },
        { upsert: true }
      );
    }
    return { userID, data };
  }
  async set(userID, updateData, dotPath) {
    userID = String(userID);
    const current = global.usersData.get(userID) || {};
    let merged = current;

    if (dotPath) {
      _setDeep(merged, dotPath, updateData);
    } else {
      merged = { ...current, ...updateData };
    }

    global.usersData.set(userID, merged);

    const col = this._col();
    if (col) {
      const mongoSet = dotPath
        ? { [`data.${dotPath}`]: updateData }
        : { data: merged };
      await col.updateOne(
        { userId: userID },
        { $set: { userId: userID, ...mongoSet } },
        { upsert: true }
      );
    }
  }

  /**
   * Remove user.
   * @param {string|number} userID
   */
  async remove(userID) {
    userID = String(userID);
    global.usersData.delete(userID);
    const col = this._col();
    if (col) await col.deleteOne({ userId: userID });
  }

  /**
   * Get user display name.
   * @param {string|number} userID
   * @returns {Promise<string>}
   */
  async getName(userID) {
    const user = await this.get(userID);
    return user?.data?.name || user?.name || String(userID);
  }

  /**
   * Refresh user info from Facebook (name, gender, vanity).
   * @param {string|number} userID
   * @param {Object} [updateData]
   */
  async refreshInfo(userID, updateData) {
    userID = String(userID);
    if (updateData) {
      await this.set(userID, updateData);
    }
  }
}

/* ════════════════════════════════════════════════════════════
   THREADS DATA
   ════════════════════════════════════════════════════════════ */
class ThreadsData {
  _col() {
    return global.db ? global.db.db("threads") : null;
  }

  /**
   * Get thread data. Auto-creates if missing.
   * @param {string|number} threadID
   * @returns {Promise<Object>}
   */
  async get(threadID) {
    threadID = String(threadID);
    const col = this._col();
    if (col) {
      const doc = await col.findOne({ threadID });
      if (doc) return doc;
    }
    return await this.create(threadID);
  }

  async getAll() {
    const col = this._col();
    if (col) return col.find({}).toArray();
    return [];
  }

  /**
   * Create thread entry.
   * @param {string|number} threadID
   * @param {Object} [threadInfo]
   */
  async create(threadID, threadInfo = {}) {
    threadID = String(threadID);
    const doc = {
      threadID,
      threadName: threadInfo.name || threadInfo.threadName || "",
      members: threadInfo.members || [],
      adminIDs: threadInfo.adminIDs || [],
      data: threadInfo.data || {
        isAdmin: false,
        prefix: null,
        language: "en",
      },
      ...threadInfo,
    };
    const col = this._col();
    if (col) {
      await col.updateOne(
        { threadID },
        { $setOnInsert: doc },
        { upsert: true }
      );
    }
    return doc;
  }

  /**
   * Set th data.
   * @param {string|number} threadID
   * @param {*} updateData
   * @param {string} [dotPath]
   */
  async set(threadID, updateData, dotPath) {
    threadID = String(threadID);
    const col = this._col();
    if (!col) return;

    const mongoSet = dotPath
      ? { [`data.${dotPath}`]: updateData }
      : { data: updateData };

    await col.updateOne(
      { threadID },
      { $set: { threadID, ...mongoSet } },
      { upsert: true }
    );
  }

  async remove(threadID) {
    threadID = String(threadID);
    const col = this._col();
    if (col) await col.deleteOne({ threadID });
  }

  /**
   * Refresh t metadata.
   * @param {string|number} threadID
   * @param {Object} threadInfo - from api.getThreadInfo()
   */
  async refreshInfo(threadID, threadInfo = {}) {
    threadID = String(threadID);
    const col = this._col();
    if (!col) return;
    await col.updateOne(
      { threadID },
      { $set: {
        threadName: threadInfo.name || threadInfo.threadName || "",
        adminIDs:   threadInfo.adminIDs || [],
        members:    threadInfo.members  || [],
        imageSrc:   threadInfo.imageSrc || null,
        emoji:      threadInfo.emoji    || null,
      }},
      { upsert: true }
    );
  }
}
class DashBoardData {
  _col() {
    return global.db ? global.db.db("dashBoardData") : null;
  }

  async get(key) {
    if (global.globalData.has(key)) return global.globalData.get(key);
    const col = this._col();
    if (col) {
      const doc = await col.findOne({ key });
      if (doc) {
        global.globalData.set(key, doc.value);
        return doc.value;
      }
    }
    return null;
  }

  async set(key, value) {
    global.globalData.set(key, value);
    const col = this._col();
    if (col) {
      await col.updateOne(
        { key },
        { $set: { key, value } },
        { upsert: true }
      );
    }
  }

  async remove(key) {
    global.globalData.delete(key);
    const col = this._col();
    if (col) await col.deleteOne({ key });
  }

  async getAll() {
    const col = this._col();
    if (col) return col.find({}).toArray();
    return [...global.globalData.entries()].map(([key, value]) => ({ key, value }));
  }
}
function _setDeep(obj, dotPath, value) {
  const keys = dotPath.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null || typeof cur[keys[i]] !== "object") {
      cur[keys[i]] = {};
    }
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

module.exports = { UsersData, ThreadsData, DashBoardData };
                
