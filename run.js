require("./utils/logger");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const hasAppState =
  !!process.env.APPSTATE ||
  fs.existsSync(path.join(__dirname, "appstate.dev.json"));

const script =
  config.DiscordMode   ? "./Discord/index"   :
  config.TelegramMode  ? "./telegram/index"  :
  "./index";

const modeName =
  config.DiscordMode   ? "Discord-KagenouBot"   :
  config.TelegramMode  ? "Telegram-KagenouBot"  :
  !hasAppState         ? "Dashboard-Only"        :
  "FB-KagenouBot";

global.log.info(`[RUN] Starting ${modeName} bot…`);

const child = spawn("node", [script], {
  stdio: "inherit",
  env: process.env
});

child.on("close", code => {
  global.log.info(`[RUN] ${script} exited with code ${code}`);
});
