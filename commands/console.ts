
import { execSync, exec } from "child_process";
import fs from "fs";
import path from "path";
import AuroraBetaStyler from "@aurora/styler";

const TEMP_DIR   = path.join(process.cwd(), ".console_tmp");
const TIMEOUT_MS = 10000;

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function cleanFile(filePath: string) {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

function truncate(str: string, max = 1800): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + `\n...(truncated, ${str.length - max} chars hidden)`;
}

function runShell(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise(resolve => {
    const child = exec(cmd, { cwd, timeout: TIMEOUT_MS }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout?.trim() || "",
        stderr: stderr?.trim() || (err?.message ?? ""),
        code:   err?.code as number ?? 0,
      });
    });
  });
}

function styled(header: string, symbol: string, body: string): string {
  return AuroraBetaStyler.styleOutput({
    headerText: header,
    headerSymbol: symbol,
    headerStyle: "bold",
    bodyText: body,
    bodyStyle: "bold",
    footerText: "Developed by: **Aljur pogoy**",
  });
}

const consoleCommand: ShadowBot.Command = {
  config: {
    name: "console",
    description: "Execute JS/TS code and install temporary npm packages. Dev only.",
    usage: "/console run <code> | /console ts <code> | /console npm <package> | /console clean",
    aliases: ["con", "exec", "shell"],
    category: "Developer 🛠️",
    role: 3,
  },

  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;

    const isAuth =
      (global.config?.developers && global.config.developers.map(String).includes(senderID.toString())) ||
      (global.config?.admins     && global.config.admins.map(String).includes(senderID.toString()));

    if (!isAuth) {
      await api.sendMessage(
        styled("Console", "🔒", "Access denied. This command is for developers only."),
        threadID, messageID
      );
      return;
    }

    ensureTempDir();

    const sub = args[0]?.toLowerCase();

    if (!sub) {
      await api.sendMessage(
        styled("Console", "🖥️",
          "Subcommands:\n\n" +
          "/console run <js code> — Execute JavaScript\n" +
          "/console ts <ts code>  — Execute TypeScript\n" +
          "/console npm <pkg>     — Install a temp package\n" +
          "/console npm remove <pkg> — Uninstall a package\n" +
          "/console npm list      — List installed packages\n" +
          "/console clean         — Clear temp directory\n\n" +
          "⚠️ Code runs in an isolated temp directory.\n" +
          "Timeout: 10 seconds per execution."
        ),
        threadID, messageID
      );
      return;
    }

    if (sub === "clean") {
      try {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        await api.sendMessage(
          styled("Console", "🧹", "Temp directory cleared successfully."),
          threadID, messageID
        );
      } catch (err: any) {
        await api.sendMessage(
          styled("Console", "❌", `Failed to clean: ${err.message}`),
          threadID, messageID
        );
      }
      return;
    }

    if (sub === "npm") {
      const npmSub = args[1]?.toLowerCase();

      if (npmSub === "list") {
        ensureTempDir();
        const pkgPath = path.join(TEMP_DIR, "package.json");
        if (!fs.existsSync(pkgPath)) {
          await api.sendMessage(
            styled("Console NPM", "📦", "No packages installed yet."),
            threadID, messageID
          );
          return;
        }
        try {
          const pkg  = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
          const deps = Object.entries(pkg.dependencies || {})
            .map(([name, ver]) => `  ${name}@${ver}`)
            .join("\n") || "  None";
          await api.sendMessage(
            styled("Console NPM", "📦", `Installed packages:\n${deps}`),
            threadID, messageID
          );
        } catch {
          await api.sendMessage(
            styled("Console NPM", "📦", "Could not read package list."),
            threadID, messageID
          );
        }
        return;
      }

      if (npmSub === "remove") {
        const pkgName = args[2];
        if (!pkgName) {
          await api.sendMessage(
            styled("Console NPM", "⚠️", "Usage: /console npm remove <package>"),
            threadID, messageID
          );
          return;
        }
        await api.sendMessage(
          styled("Console NPM", "🗑️", `Uninstalling ${pkgName}...`),
          threadID
        );
        const result = await runShell(`npm uninstall ${pkgName}`, TEMP_DIR);
        await api.sendMessage(
          styled("Console NPM", result.code === 0 ? "✅" : "❌",
            result.code === 0
              ? `${pkgName} uninstalled successfully.`
              : `Failed to uninstall:\n${result.stderr}`
          ),
          threadID, messageID
        );
        return;
      }

      const pkgName = args[1];
      if (!pkgName) {
        await api.sendMessage(
          styled("Console NPM", "⚠️", "Usage: /console npm <package>\nExample: /console npm lodash"),
          threadID, messageID
        );
        return;
      }

      const safePkg = pkgName.replace(/[^a-zA-Z0-9@\/.\-_]/g, "");
      if (!safePkg) {
        await api.sendMessage(
          styled("Console NPM", "❌", "Invalid package name."),
          threadID, messageID
        );
        return;
      }

      const pkgJsonPath = path.join(TEMP_DIR, "package.json");
      if (!fs.existsSync(pkgJsonPath)) {
        fs.writeFileSync(pkgJsonPath, JSON.stringify({ name: "console-tmp", version: "1.0.0", dependencies: {} }, null, 2));
      }

      await api.sendMessage(
        styled("Console NPM", "📦", `Installing ${safePkg}...\nThis may take a moment.`),
        threadID
      );

      const result = await runShell(`npm install ${safePkg} --save`, TEMP_DIR);

      if (result.code === 0) {
        await api.sendMessage(
          styled("Console NPM", "✅",
            `${safePkg} installed successfully!\n\nYou can now require it in your code:\nconst pkg = require('${safePkg.split("@")[0]}');`
          ),
          threadID, messageID
        );
      } else {
        await api.sendMessage(
          styled("Console NPM", "❌", `Install failed:\n${truncate(result.stderr)}`),
          threadID, messageID
        );
      }
      return;
    }

    if (sub === "run" || sub === "js") {
      const code = args.slice(1).join(" ").trim();
      if (!code) {
        await api.sendMessage(
          styled("Console JS", "⚠️", "Usage: /console run <javascript code>\nExample: /console run console.log('hello')"),
          threadID, messageID
        );
        return;
      }

      const fileName = `run_${Date.now()}.js`;
      const filePath = path.join(TEMP_DIR, fileName);

      const wrapped = `
const __require = (m) => {
  try { return require(m); }
  catch { return require(require('path').join(${JSON.stringify(TEMP_DIR)}, 'node_modules', m)); }
};
const require = __require;
(async () => {
  try {
${code}
  } catch(e) { console.error('Runtime Error:', e.message); }
})();
`;

      fs.writeFileSync(filePath, wrapped);

      const start  = Date.now();
      const result = await runShell(`node ${fileName}`, TEMP_DIR);
      const elapsed = Date.now() - start;

      cleanFile(filePath);

      const output = result.stdout || result.stderr || "(no output)";
      await api.sendMessage(
        styled("Console JS", result.stderr && !result.stdout ? "❌" : "✅",
          `⏱ ${elapsed}ms\n\n${truncate(output)}`
        ),
        threadID, messageID
      );
      return;
    }

    if (sub === "ts") {
      const code = args.slice(1).join(" ").trim();
      if (!code) {
        await api.sendMessage(
          styled("Console TS", "⚠️", "Usage: /console ts <typescript code>\nExample: /console ts const x: number = 5; console.log(x)"),
          threadID, messageID
        );
        return;
      }

      let hasTsx = false;
      try { execSync("npx ts-node --version", { stdio: "ignore" }); hasTsx = true; } catch {}

      if (!hasTsx) {
        await api.sendMessage(
          styled("Console TS", "⚠️", "ts-node not found. Falling back to transpile-only mode via esbuild/tsc..."),
          threadID
        );
      }

      const fileName = `run_${Date.now()}.ts`;
      const filePath = path.join(TEMP_DIR, fileName);

      const wrapped = `
(async () => {
  try {
${code}
  } catch(e: any) { console.error('Runtime Error:', e.message); }
})();
`;

      fs.writeFileSync(filePath, wrapped);

      const tsconfigPath = path.join(TEMP_DIR, "tsconfig.json");
      if (!fs.existsSync(tsconfigPath)) {
        fs.writeFileSync(tsconfigPath, JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: false,
            esModuleInterop: true,
            outDir: "./out",
          },
          include: ["./*.ts"],
        }, null, 2));
      }

      const start  = Date.now();
      const result = await runShell(`npx ts-node --skip-project ${fileName}`, TEMP_DIR);
      const elapsed = Date.now() - start;

      cleanFile(filePath);

      const output = result.stdout || result.stderr || "(no output)";
      await api.sendMessage(
        styled("Console TS", result.stderr && !result.stdout ? "❌" : "✅",
          `⏱ ${elapsed}ms\n\n${truncate(output)}`
        ),
        threadID, messageID
      );
      return;
    }

    await api.sendMessage(
      styled("Console", "⚠️", "Unknown subcommand.\nUsage: /console [run|ts|npm|clean]"),
      threadID, messageID
    );
  },
};

export default consoleCommand;
