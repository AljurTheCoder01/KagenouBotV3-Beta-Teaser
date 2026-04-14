import chalk from "chalk";
import path from "path";
import fs from "fs-extra";

export const REPLY_TIMEOUT = 300;

global.commands          = new Map();
global.nonPrefixCommands = new Map();
global.usersData         = new Map();
global.globalData        = new Map();
global.userCooldowns     = new Map();
global.usageTracker      = new Map();
global.nsfwEnabled       = new Map();
global.disabledCommands  = new Map();
global.reactionData      = new Map();
global.threadConfigs     = new Map();
global.replyListeners    = new Map();
global.db                = null;
global.botApi            = null;
global.maintenanceMode   = false;
global.profanityFilter   = null;
global.profanityEnabled  = false;

global.config = {
  admins:       [],
  moderators:   [],
  developers:   [],
  vips:         [],
  Prefix:       ["/"],
  botName:      "EnkiduBot",
  mongoUri:     null,
  EnkiduPrefix: "/",
};

global.log = {
  info:    (msg: string) => console.log(chalk.blue("[INFO]"),    msg),
  warn:    (msg: string) => console.log(chalk.yellow("[WARN]"),  msg),
  error:   (msg: string) => console.log(chalk.red("[ERROR]"),    msg),
  success: (msg: string) => console.log(chalk.green("[SUCCESS]"),msg),
  event:   (msg: string) => console.log(chalk.magenta("[EVENT]"),msg),
};

global.getPrefix = (threadID: string): string => {
  const cfg = global.threadConfigs.get(threadID);
  return (cfg && cfg.prefix) || global.config.EnkiduPrefix || "/";
};

global.setPrefix = (threadID: string, prefix: string): void => {
  const cfg = (global.threadConfigs.get(threadID) || {}) as { prefix?: string; [key: string]: any };
  cfg.prefix = prefix;
  global.threadConfigs.set(threadID, cfg);
};

global.getUserRole = (uid: string): 0 | 1 | 2 | 3 | 4 => {
  uid = String(uid);
  const { developers = [], vips = [], moderators = [], admins = [] } = global.config;
  if (developers.map(String).includes(uid)) return 3;
  if (vips.map(String).includes(uid))       return 4;
  if (moderators.map(String).includes(uid)) return 2;
  if (admins.map(String).includes(uid))     return 1;
  return 0;
};

global.trackUsage = (commandName: string): void => {
  global.usageTracker.set(commandName, (global.usageTracker.get(commandName) || 0) + 1);
};

global.getUsageStats = (): [string, number][] => Array.from(global.usageTracker.entries());

global.getXP = async (userID: string): Promise<number> => {
  if (global.usersData.has(userID)) return global.usersData.get(userID)?.xp || 0;
  if (global.db) {
    const user = await global.db.db("users").findOne({ userId: userID });
    return user?.data?.xp || 0;
  }
  return 0;
};

global.addXP = async (userID: string, amount: number): Promise<number> => {
  const currentXP = await global.getXP(userID);
  const newXP     = currentXP + amount;
  const newLevel  = Math.floor(newXP / 200);
  const user      = global.usersData.get(userID) || { balance: 0, bank: 0, xp: 0, level: 0 };
  user.xp    = newXP;
  user.level = newLevel;
  global.usersData.set(userID, user);
  if (global.db) {
    await global.db.db("users").updateOne(
      { userId: userID },
      { $set: { userId: userID, data: { ...user, xp: newXP, level: newLevel } } },
      { upsert: true }
    );
  }
  return newXP;
};

global.getLevel = async (userID: string): Promise<number> => {
  if (global.usersData.has(userID)) return global.usersData.get(userID)?.level || 0;
  if (global.db) {
    const user = await global.db.db("users").findOne({ userId: userID });
    return user?.data?.level || 0;
  }
  return 0;
};

global.log.success("[CORE] global.ts ready.");

export {};
