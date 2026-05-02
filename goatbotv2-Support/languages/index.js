"use strict";

const path = require("path");
const fs   = require("fs-extra");

const LANG_DIR = path.join(__dirname);
const CMD_LANG_DIR = path.join(__dirname, "..", "commands", "languages");
const langCache = {};

/** Default language */
let defaultLang = "en";
function loadLang(commandName, lang) {
  lang = lang || defaultLang;
  const cacheKey = `${commandName}:${lang}`;
  if (langCache[cacheKey]) return langCache[cacheKey];

  let merged = {};
  const globalFile = path.join(LANG_DIR, `${lang}.json`);
  if (fs.existsSync(globalFile)) {
    try { Object.assign(merged, JSON.parse(fs.readFileSync(globalFile, "utf8"))); }
    catch (_) {}
  }
  const cmdFile = path.join(CMD_LANG_DIR, commandName, `${lang}.json`);
  if (fs.existsSync(cmdFile)) {
    try {
      const cmdLang = JSON.parse(fs.readFileSync(cmdFile, "utf8"));
      merged = { ...merged, ...cmdLang };
    } catch (_) {}
  }

  langCache[cacheKey] = merged;
  return merged;
}
function get(commandName, key, ...args) {
  const strings = loadLang(commandName, defaultLang);
  let str = strings[key] || key;
  args.forEach((arg, i) => {
    str = str.replace(new RegExp(`%${i + 1}`, "g"), String(arg));
  });
  return str;
}

/**
 * @param {string} [lang="en"]
 * @returns {{ get: Function, setLang: Function }}
 */
function init(lang = "en") {
  defaultLang = lang;
  fs.mkdirSync(LANG_DIR, { recursive: true });
  fs.mkdirSync(CMD_LANG_DIR, { recursive: true });
  const enFile = path.join(LANG_DIR, "en.json");
  if (!fs.existsSync(enFile)) {
    fs.writeJsonSync(enFile, {
      "noPermission": "🛡️ You don't have permission to use this command.",
      "onCooldown":   "⏳ Please wait %1 second(s) before using this command again.",
      "error":        "❌ An error occurred: %1",
      "maintenance":  "🔧 This command is under maintenance. Please try again later.",
    }, { spaces: 2 });
  }

  global.log.info(`[GoatBot:Lang] Language system initialized. Default: ${defaultLang}`);
  return { get, setLang };
}

/**
* @param {string} lang
 */
function setLang(lang) {
  defaultLang = lang;
  Object.keys(langCache).forEach(k => delete langCache[k]);
  global.log.info(`[GoatBot:Lang] Language changed to: ${lang}`);
}

module.exports = { init, get, setLang, loadLang };
