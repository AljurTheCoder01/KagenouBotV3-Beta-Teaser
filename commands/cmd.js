/*
 * @author Aljur Pogoy
 * @command cmd
 * @description Live Command Package Manager for ShadowBot/Kagenou
 * @version 1.0.0
 */

import * as fs from "fs-extra";
import * as path from "path";
import AuroraBetaStyler from '@aurora/styler';
const COMMANDS_DIR = path.join(__dirname, "../commands");
const TRASH_DIR = path.join(__dirname, "../database/cmd_trash");
const SUPPORTED_EXTS = [".js", ".ts"];

fs.ensureDirSync(TRASH_DIR);

function resolveCommandFile(cmdName: string): string | null {
  for (const ext of SUPPORTED_EXTS) {
    const filePath = path.join(COMMANDS_DIR, `${cmdName}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function detectExtension(code: string): ".ts" | ".js" {
  const tsSignals = [
    /:\s*(string|number|boolean|void|any|object|never)\b/,
    /^import\s+.*\s+from\s+['"]/m,
    /export\s+default\s+/,
    /interface\s+\w+/,
    /type\s+\w+\s*=/,
    /<\w+>/,
  ];
  return tsSignals.some(r => r.test(code)) ? ".ts" : ".js";
}

function registerToGlobal(command: any) {
  const name = (command.config?.name || command.name || "").toLowerCase();
  if (!name) return false;
  const aliases = command.config?.aliases || command.aliases || [];
  global.commands.set(name, command);
  aliases.forEach((a: string) => global.commands.set(a.toLowerCase(), command));
  if (command.config?.nonPrefix || command.nonPrefix) {
    global.nonPrefixCommands.set(name, command);
  }
  if (command.handleEvent) {
    if (!global.eventCommands.find((c: any) => (c.config?.name || c.name) === name)) {
      global.eventCommands.push(command);
    }
  }
  return true;
}

function unregisterFromGlobal(cmdName: string) {
  const name = cmdName.toLowerCase();
  const command = global.commands.get(name);
  if (!command) return false;
  const aliases = command.config?.aliases || command.aliases || [];
  global.commands.delete(name);
  aliases.forEach((a: string) => global.commands.delete(a.toLowerCase()));
  global.nonPrefixCommands.delete(name);
  const idx = global.eventCommands.findIndex(
    (c: any) => (c.config?.name || c.name || "").toLowerCase() === name
  );
  if (idx !== -1) global.eventCommands.splice(idx, 1);
  return true;
}

function requireFresh(filePath: string): any {
  delete require.cache[require.resolve(filePath)];
  const mod = require(filePath);
  return mod.default || mod;
}

async function installCommand(
  api: any,
  event: any,
  cmdName: string,
  code: string
) {
  const { threadID, messageID } = event;

  if (!cmdName || !code) {
    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Install",
        headerSymbol: "📦",
        headerStyle: "bold",
        bodyText: `Usage: /cmd install <name> <code>\n\nYou can paste .js or .ts code directly.\nExtension is auto-detected from your code.`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  }

  const ext = detectExtension(code);
  const fileName = `${cmdName}${ext}`;
  const filePath = path.join(COMMANDS_DIR, fileName);

  if (fs.existsSync(filePath)) {
    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Install — Conflict",
        headerSymbol: "⚠️",
        headerStyle: "bold",
        bodyText: `A command named "${cmdName}${ext}" already exists.\n\nUnload it first with:\n/cmd unload ${cmdName}\n\nOr delete it with:\n/cmd trash ${cmdName}`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  }

  try {
    fs.writeFileSync(filePath, code, "utf8");

    const command = requireFresh(filePath);
    const registered = registerToGlobal(command);

    if (!registered) {
      fs.removeSync(filePath);
      return api.sendMessage(
        AuroraBetaStyler.styleOutput({
          headerText: "CMD Install — Invalid",
          headerSymbol: "❌",
          headerStyle: "bold",
          bodyText: `Failed to register "${cmdName}".\n\nMake sure your command exports a valid config.name and run/execute function.`,
          bodyStyle: "sansSerif",
          footerText: "CMD Package Manager",
        }),
        threadID,
        messageID
      );
    }

    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Install — Success",
        headerSymbol: "✅",
        headerStyle: "bold",
        bodyText: `Command "${cmdName}" installed successfully!\n\n📄 File: ${fileName}\n🔤 Type: ${ext === ".ts" ? "TypeScript" : "JavaScript"}\n🟢 Status: Live & Ready`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  } catch (err: any) {
    if (fs.existsSync(filePath)) fs.removeSync(filePath);
    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Install — Error",
        headerSymbol: "💥",
        headerStyle: "bold",
        bodyText: `Install failed for "${cmdName}".\n\nError: ${err.message}`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  }
}

async function loadCommand(api: any, event: any, cmdName: string) {
  const { threadID, messageID } = event;

  if (cmdName.toLowerCase() === "all") {
    const files = fs.readdirSync(COMMANDS_DIR).filter(f =>
      SUPPORTED_EXTS.some(e => f.endsWith(e))
    );
    let loaded = 0, failed = 0, skipped = 0;
    const results: string[] = [];

    for (const file of files) {
      const name = path.basename(file, path.extname(file));
      try {
        const filePath = path.join(COMMANDS_DIR, file);
        const command = requireFresh(filePath);
        if (registerToGlobal(command)) {
          loaded++;
          results.push(`✅ ${name}`);
        } else {
          skipped++;
          results.push(`⏭️ ${name} (invalid)`);
        }
      } catch (err: any) {
        failed++;
        results.push(`❌ ${name} (${err.message})`);
      }
    }

    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Load All",
        headerSymbol: "📂",
        headerStyle: "bold",
        bodyText: `Loaded: ${loaded} | Skipped: ${skipped} | Failed: ${failed}\n\n${results.join("\n")}`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  }

  const filePath = resolveCommandFile(cmdName);
  if (!filePath) {
    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Load — Not Found",
        headerSymbol: "🔍",
        headerStyle: "bold",
        bodyText: `No command file found for "${cmdName}".\n\nMake sure the file exists in the commands folder.\nInstall it first with:\n/cmd install ${cmdName} <code>`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  }

  try {
    const command = requireFresh(filePath);
    const registered = registerToGlobal(command);
    const ext = path.extname(filePath);

    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: registered ? "CMD Load — Success" : "CMD Load — Invalid",
        headerSymbol: registered ? "🟢" : "⚠️",
        headerStyle: "bold",
        bodyText: registered
          ? `Command "${cmdName}" loaded successfully!\n\n📄 File: ${path.basename(filePath)}\n🔤 Type: ${ext === ".ts" ? "TypeScript" : "JavaScript"}\n🟢 Status: Active`
          : `File found but "${cmdName}" has no valid config.name or run function.`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  } catch (err: any) {
    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Load — Error",
        headerSymbol: "💥",
        headerStyle: "bold",
        bodyText: `Failed to load "${cmdName}".\n\nError: ${err.message}`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  }
}

async function unloadCommand(api: any, event: any, cmdName: string) {
  const { threadID, messageID } = event;

  if (cmdName.toLowerCase() === "all") {
    const names = [...global.commands.keys()];
    let unloaded = 0;
    const results: string[] = [];

    for (const name of names) {
      const success = unregisterFromGlobal(name);
      if (success) {
        unloaded++;
        results.push(`🔴 ${name}`);
      }
    }

    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Unload All",
        headerSymbol: "🔴",
        headerStyle: "bold",
        bodyText: `Unloaded ${unloaded} command(s) from memory.\n\nFiles are NOT deleted. Use /cmd load all to reload.\n\n${results.slice(0, 20).join("\n")}${results.length > 20 ? `\n...and ${results.length - 20} more` : ""}`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  }

  const existed = global.commands.has(cmdName.toLowerCase());
  const success = unregisterFromGlobal(cmdName);

  return api.sendMessage(
    AuroraBetaStyler.styleOutput({
      headerText: success ? "CMD Unload — Success" : "CMD Unload — Not Found",
      headerSymbol: success ? "🔴" : "🔍",
      headerStyle: "bold",
      bodyText: success
        ? `Command "${cmdName}" unloaded from memory.\n\n⚠️ File still exists on disk.\nUse /cmd load ${cmdName} to bring it back.\nUse /cmd trash ${cmdName} to delete it permanently.`
        : `"${cmdName}" is not currently loaded in memory.${!existed ? "\nIt may not be installed." : ""}`,
      bodyStyle: "sansSerif",
      footerText: "CMD Package Manager",
    }),
    threadID,
    messageID
  );
}

async function trashCommand(api: any, event: any, cmdName: string) {
  const { threadID, messageID } = event;

  if (cmdName.toLowerCase() === "all") {
    const files = fs.readdirSync(COMMANDS_DIR).filter(f =>
      SUPPORTED_EXTS.some(e => f.endsWith(e))
    );
    let trashed = 0, failed = 0;
    const results: string[] = [];

    for (const file of files) {
      const name = path.basename(file, path.extname(file));
      try {
        const src = path.join(COMMANDS_DIR, file);
        const dest = path.join(TRASH_DIR, `${name}_${Date.now()}${path.extname(file)}`);
        fs.moveSync(src, dest, { overwrite: true });
        unregisterFromGlobal(name);
        trashed++;
        results.push(`🗑️ ${name}`);
      } catch (err: any) {
        failed++;
        results.push(`❌ ${name} (${err.message})`);
      }
    }

    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Trash All",
        headerSymbol: "🗑️",
        headerStyle: "bold",
        bodyText: `Trashed: ${trashed} | Failed: ${failed}\n\nAll files moved to /database/cmd_trash/\n\n${results.join("\n")}`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  }

  const filePath = resolveCommandFile(cmdName);
  if (!filePath) {
    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Trash — Not Found",
        headerSymbol: "🔍",
        headerStyle: "bold",
        bodyText: `No command file found for "${cmdName}" to trash.`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  }

  try {
    const ext = path.extname(filePath);
    const dest = path.join(TRASH_DIR, `${cmdName}_${Date.now()}${ext}`);
    fs.moveSync(filePath, dest, { overwrite: true });
    unregisterFromGlobal(cmdName);

    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Trash — Done",
        headerSymbol: "🗑️",
        headerStyle: "bold",
        bodyText: `Command "${cmdName}" has been trashed.\n\n📄 Moved to: /database/cmd_trash/\n🔴 Unloaded from memory.\n\n⚠️ This is NOT permanent. Files in trash can be recovered manually.`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  } catch (err: any) {
    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD Trash — Error",
        headerSymbol: "💥",
        headerStyle: "bold",
        bodyText: `Failed to trash "${cmdName}".\n\nError: ${err.message}`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  }
}

async function listCommands(api: any, event: any) {
  const { threadID, messageID } = event;
  const loaded = [...global.commands.keys()].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  const files = fs.readdirSync(COMMANDS_DIR).filter(f =>
    SUPPORTED_EXTS.some(e => f.endsWith(e))
  );
  const trashFiles = fs.readdirSync(TRASH_DIR).filter(f =>
    SUPPORTED_EXTS.some(e => f.endsWith(e))
  );

  return api.sendMessage(
    AuroraBetaStyler.styleOutput({
      headerText: "CMD Status",
      headerSymbol: "📋",
      headerStyle: "bold",
      bodyText:
        `🟢 Loaded in Memory: ${loaded.length}\n` +
        `📁 Files on Disk: ${files.length}\n` +
        `🗑️ In Trash: ${trashFiles.length}\n\n` +
        `Loaded Commands:\n${loaded.slice(0, 30).join(", ")}${loaded.length > 30 ? ` ...+${loaded.length - 30} more` : ""}\n\n` +
        `Available Actions:\n` +
        `/cmd install <name> <code>\n` +
        `/cmd load <name|all>\n` +
        `/cmd unload <name|all>\n` +
        `/cmd trash <name|all>`,
      bodyStyle: "sansSerif",
      footerText: "CMD Package Manager",
    }),
    threadID,
    messageID
  );
}

const cmdCommand = {
  config: {
    name: "cmd",
    version: "13.0.0",
    author: "Aljur Pogoy",
    role: 3,
    cooldown: 3,
  },

  run: async ({ api, event, args }: { api: any; event: any; args: string[] }) => {
    const { threadID, messageID, senderID } = event;
    const subCommand = args[0]?.toLowerCase();

    if (!subCommand || subCommand === "list" || subCommand === "status") {
      return listCommands(api, event);
    }

    if (subCommand === "install") {
      const cmdName = args[1];
      const code = args.slice(2).join(" ");
      return installCommand(api, event, cmdName, code);
    }

    if (subCommand === "load") {
      const cmdName = args[1];
      if (!cmdName) {
        return api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "CMD Load",
            headerSymbol: "📂",
            headerStyle: "bold",
            bodyText: "Usage: /cmd load <name|all>",
            bodyStyle: "sansSerif",
            footerText: "CMD Package Manager",
          }),
          threadID,
          messageID
        );
      }
      return loadCommand(api, event, cmdName);
    }

    if (subCommand === "unload") {
      const cmdName = args[1];
      if (!cmdName) {
        return api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "CMD Unload",
            headerSymbol: "🔴",
            headerStyle: "bold",
            bodyText: "Usage: /cmd unload <name|all>",
            bodyStyle: "sansSerif",
            footerText: "CMD Package Manager",
          }),
          threadID,
          messageID
        );
      }
      return unloadCommand(api, event, cmdName);
    }

    if (subCommand === "trash") {
      const cmdName = args[1];
      if (!cmdName) {
        return api.sendMessage(
          AuroraBetaStyler.styleOutput({
            headerText: "CMD Trash",
            headerSymbol: "🗑️",
            headerStyle: "bold",
            bodyText: "Usage: /cmd trash <name|all>",
            bodyStyle: "sansSerif",
            footerText: "CMD Package Manager",
          }),
          threadID,
          messageID
        );
      }
      return trashCommand(api, event, cmdName);
    }

    return api.sendMessage(
      AuroraBetaStyler.styleOutput({
        headerText: "CMD — Unknown Action",
        headerSymbol: "❓",
        headerStyle: "bold",
        bodyText:
          `Unknown subcommand: "${subCommand}"\n\n` +
          `Available Commands:\n` +
          `📦 /cmd install <name> <code>\n` +
          `📂 /cmd load <name|all>\n` +
          `🔴 /cmd unload <name|all>\n` +
          `🗑️ /cmd trash <name|all>\n` +
          `📋 /cmd list`,
        bodyStyle: "sansSerif",
        footerText: "CMD Package Manager",
      }),
      threadID,
      messageID
    );
  },
};

export default cmdCommand;
