import AuroraBetaStyler from "@aurora/styler";
import SHOP_DATA from "@wistoria-wand-and-sword/shopitems";
import CHARACTERS from "@wistoria-wand-and-sword/characters";
import DUNGEONS from "@wistoria-wand-and-sword/dungeons";
import GAME_DATA from "@wistoria-wand-and-sword/gamedata";

const WANDS = (SHOP_DATA as any).wands;
const POTIONS = (SHOP_DATA as any).potions;
const ACCESSORIES = (SHOP_DATA as any).accessories;
const SPELLS = (GAME_DATA as any).spells;
const TITLES = (GAME_DATA as any).titles as any[];
const RANKS = (GAME_DATA as any).ranks as any[];
const QUESTS_DEF = (GAME_DATA as any).quests;
const C = (GAME_DATA as any).constants;

const DEV_UID: string = C.DEV_UID;
const MAX_WAND_UPGRADE: number = C.MAX_WAND_UPGRADE;
const MAX_RANK: number = C.MAX_RANK;
const BATTLE_COOLDOWN: number = C.BATTLE_COOLDOWN_SECS;
const DUNGEON_COOLDOWN: number = C.DUNGEON_COOLDOWN_SECS;
const DAILY_COOLDOWN: number = C.DAILY_COOLDOWN_SECS;
const BOND_COOLDOWN: number = C.BOND_COOLDOWN_SECS;
const DUEL_COOLDOWN: number = C.DUEL_COOLDOWN_SECS;
const TRAIN_COOLDOWN: number = C.TRAIN_COOLDOWN_SECS;
const PARTY_DURATION: number = C.PARTY_DURATION_SECS;
const SURGE_DURATION: number = C.SURGE_DURATION_SECS;
const PARTY_MAX: number = C.PARTY_MAX_MEMBERS;
const GOLD_DROP_CHANCE: number = C.GOLD_DROP_CHANCE;
const EXP_PER_LEVEL: number = C.EXP_PER_LEVEL;
const RARITY_ORDER: string[] = C.RARITY_ORDER;;

const activeParties = new Map<string, {
  hostID: string; members: string[]; expiresAt: number;
  currentFloor: number; active: boolean;
}>();

const activeSurges = new Map<string, {
  expiresAt: number; claimedBy: string | null;
}>();

const activeRaids = new Map<string, {
  hostID: string; members: string[]; expiresAt: number;
}>();

interface WWSData {
  userID: string;
  name?: string;
  characterID?: string;
  characterName?: string;
  rarity?: string;
  type?: string;
  stats: {
    magicPower: number;
    magicPen: number;
    swordPower: number;
    speed: number;
    defense: number;
    luck: number;
  };
  level: number;
  exp: number;
  silver: number;
  gold: number;
  equippedWand?: string;
  wandUpgrades: { [wandID: string]: number };
  inventory: {
    wands: { [wandID: string]: { name: string; level: number } };
    potions: { [potID: string]: number };
    accessories: { [accID: string]: number };
    materials: { [key: string]: number };
  };
  spells: string[];
  activeSpell?: string;
  dungeonFloor: number;
  dungeonCooldown: number;
  battleCooldown: number;
  duelCooldown: number;
  trainCooldown: number;
  dailyCooldown: number;
  bondCooldown: number;
  lastLoginDate: string;
  loginStreak: number;
  mageRank: number;
  totalBattleWins: number;
  totalDuelWins: number;
  totalDungeonClears: number;
  guild?: string;
  titles: string[];
  activeTitle?: string;
  quests: { [key: string]: { progress: number; completed: boolean } };
  bondLevel: number;
  spellAmpCharges: number;
  disabled?: boolean;
  signature?: string;
}

interface GuildData {
  name: string;
  founderID: string;
  members: string[];
  totalPower: number;
  createdAt: number;
}

function isDevUser(uid: string): boolean {
  return uid === DEV_UID;
}

function isAuthorized(uid: string, isDev: boolean): boolean {
  const s = uid.toString();
  return isDev
    || (global.config?.admins    && global.config.admins.map(String).includes(s))
    || (global.config?.developers && global.config.developers.map(String).includes(s))
    || (global.config?.vips      && global.config.vips.map(String).includes(s));
}

function calcLevel(exp: number): number {
  return Math.max(1, Math.floor(exp / EXP_PER_LEVEL) + 1);
}

function calcPower(s: WWSData): number {
  if (s.type === "Sword") {
    return (s.stats.swordPower || 0) * 1.0
         + (s.stats.speed      || 0) * 0.6
         + (s.stats.defense    || 0) * 0.4
         + (s.stats.luck       || 0) * 0.2;
  }
  return (s.stats.magicPower || 0) * 1.0
       + (s.stats.magicPen   || 0) * 0.7
       + (s.stats.defense    || 0) * 0.4
       + (s.stats.luck       || 0) * 0.2;
}

function getRankData(rank: number): any {
  return RANKS.find((r: any) => r.rank === rank) || RANKS[0];
}

function styled(header: string, symbol: string, body: string): string {
  return AuroraBetaStyler.styleOutput({
    headerText: header, headerSymbol: symbol, headerStyle: "bold",
    bodyText: body, bodyStyle: "bold",
    footerText: "Developed by: **Aljur pogoy**",
  });
}

function titleLine(newTitles: string[]): string {
  if (newTitles.length === 0) return "";
  return "\n\n🎖️ New Title(s) Unlocked: " + newTitles.map(id => TITLES.find((t: any) => t.id === id)?.label || id).join(", ");
}

function checkAndGrantTitles(s: WWSData): string[] {
  const newOnes: string[] = [];
  s.titles = s.titles || [];
  const grant = (id: string) => {
    if (!s.titles.includes(id)) { s.titles.push(id); newOnes.push(id); }
  };
  if (s.name)                                grant("first_step");
  if ((s.dungeonFloor || 0) >= 10)           grant("dungeon_novice");
  if ((s.totalDungeonClears || 0) >= 1 && (s.dungeonFloor || 0) >= 30) grant("dungeon_adept");
  if ((s.dungeonFloor || 0) >= 60)           grant("dungeon_veteran");
  if ((s.dungeonFloor || 0) >= 100)          grant("floor_conqueror");
  if ((s.spells || []).length >= 5)          grant("spell_scholar");
  if ((s.spells || []).length >= 20)         grant("spell_master");
  if (Object.keys(s.inventory.wands).length >= 1) grant("wand_wielder");
  if (Object.values(s.wandUpgrades).some(v => v >= MAX_WAND_UPGRADE)) grant("wand_master");
  if ((s.totalBattleWins || 0) >= 10)        grant("battle_winner");
  if ((s.totalBattleWins || 0) >= 100)       grant("battle_veteran");
  if ((s.totalDuelWins || 0) >= 20)          grant("duel_champion");
  if ((s.loginStreak || 0) >= 7)             grant("streak_devotee");
  if ((s.mageRank || 1) >= 2)               grant("rank_bronze");
  if ((s.mageRank || 1) >= 4)               grant("rank_silver");
  if ((s.mageRank || 1) >= 6)               grant("rank_gold");
  if ((s.mageRank || 1) >= 8)               grant("rank_platinum");
  if ((s.mageRank || 1) >= 10)              grant("magia_vander");
  if (s.guild)                               grant("guild_founder");
  if (s.type === "Sword" && isDevUser(s.userID)) grant("will_wielder");
  const fiveWonders = ["C003","C004","C006","C007","C008"];
  if (fiveWonders.includes(s.characterID || ""))  grant("five_wonders_fan");
  return newOnes;
}

async function getWWSData(db: any, userID: string): Promise<WWSData> {
  const col = db.db("wws_players");
  let s = await col.findOne({ userID });
  if (!s) {
    s = {
      userID, name: undefined, characterID: undefined, characterName: undefined,
      rarity: undefined, type: undefined,
      stats: { magicPower: 0, magicPen: 0, swordPower: 0, speed: 0, defense: 100, luck: 100 },
      level: 1, exp: 0, silver: 0, gold: 0,
      equippedWand: undefined, wandUpgrades: {},
      inventory: { wands: {}, potions: {}, accessories: {}, materials: {} },
      spells: [], activeSpell: undefined,
      dungeonFloor: 0, dungeonCooldown: 0, battleCooldown: 0,
      duelCooldown: 0, trainCooldown: 0, dailyCooldown: 0, bondCooldown: 0,
      lastLoginDate: "", loginStreak: 0, mageRank: 1,
      totalBattleWins: 0, totalDuelWins: 0, totalDungeonClears: 0,
      guild: undefined, titles: [], activeTitle: undefined,
      quests: {}, bondLevel: 0, spellAmpCharges: 0, disabled: false,
      signature: undefined,
    };
    await saveWWSData(db, userID, s);
  }
  return s;
}

async function saveWWSData(db: any, userID: string, data: WWSData): Promise<void> {
  await db.db("wws_players").updateOne({ userID }, { $set: data }, { upsert: true });
}

function applyDevBuff(s: WWSData): void {
  s.characterID   = "C001";
  s.characterName = "Will Serfort";
  s.rarity        = "XXSR";
  s.type          = "Sword";
  s.signature     = "Absolute Sword — Zero Magic, Infinite Blade";
  s.stats = { magicPower: 0, magicPen: 0, swordPower: 99999999, speed: 99999999, defense: 99999999, luck: 99999999 };
  s.level         = 9999;
  s.exp           = 99999999;
  s.silver        = 999999999;
  s.gold          = 999999;
  s.mageRank      = 10;
  s.dungeonFloor  = 100;
  s.totalBattleWins = 99999;
  s.totalDuelWins   = 99999;
  s.totalDungeonClears = 999;
  s.bondLevel     = 20;
  s.loginStreak   = 99;
  s.spellAmpCharges = 99;
  s.spells        = Object.keys(SPELLS);
  s.activeSpell   = "SP20";
  s.titles        = TITLES.map((t: any) => t.id);
  for (const id of Object.keys(WANDS)) {
    s.inventory.wands[id] = { name: (WANDS as any)[id].name, level: MAX_WAND_UPGRADE };
    s.wandUpgrades[id]    = MAX_WAND_UPGRADE;
  }
  s.equippedWand = "W030";
  for (const id of Object.keys(POTIONS))     s.inventory.potions[id]     = 999;
  for (const id of Object.keys(ACCESSORIES)) s.inventory.accessories[id] = 99;
  for (const qk of Object.keys(QUESTS_DEF)) {
    s.quests[qk] = { progress: (QUESTS_DEF as any)[qk].goal, completed: true };
  }
}

function initQuests(isDev: boolean): WWSData["quests"] {
  const q: WWSData["quests"] = {};
  for (const [key, def] of Object.entries(QUESTS_DEF as Record<string, any>)) {
    q[key] = { progress: isDev ? def.goal : 0, completed: isDev };
  }
  return q;
}

function updateQuestProgress(s: WWSData, type: string, amount = 1): { silver: number; gold: number; exp: number; completed: string[] } {
  let silver = 0; let gold = 0; let exp = 0;
  const completed: string[] = [];
  for (const [key, def] of Object.entries(QUESTS_DEF as Record<string, any>)) {
    const q = s.quests[key];
    if (!q || q.completed) continue;
    if (def.type !== type) continue;
    q.progress = Math.min(def.goal, q.progress + amount);
    if (q.progress >= def.goal) {
      q.completed = true;
      silver += def.reward.silver;
      gold   += def.reward.gold;
      exp    += def.reward.exp;
      completed.push(def.description);
    }
  }
  s.silver = (s.silver || 0) + silver;
  s.gold   = (s.gold   || 0) + gold;
  s.exp    = (s.exp    || 0) + exp;
  return { silver, gold, exp, completed };
}

function questRewardLine(r: { silver: number; gold: number; exp: number; completed: string[] }): string {
  if (r.completed.length === 0) return "";
  return `\n\n✅ Quest Completed!\n${r.completed.join("\n")}\n+${r.silver.toLocaleString()} 🪙 +${r.gold} 💰 +${r.exp.toLocaleString()} EXP`;
}

const wwsCommand: ShadowBot.Command = {
  config: {
    name: "wws",
    description: "Wistoria: Wand and Sword — become a mage, conquer the dungeon, reach Magia Vander!",
    usage: "wws | wws menu | wws help | wws register <name> | wws status | ... (see wws menu)",
    aliases: ["wistoria"],
    category: "Games 🎮",
  },

  run: async ({ api, event, args, db }) => {
    if (!db) { await api.sendMessage("Database not available.", event.threadID, event.messageID); return; }

    const { threadID, messageID, senderID } = event;
    const action      = args[0]?.toLowerCase();
    const currentTime = Math.floor(Date.now() / 1000);
    const isDev       = isDevUser(senderID.toString());

    if (!action) {
      await api.sendMessage(styled("Wistoria: Wand and Sword", "🪄",
        `Welcome to the world of Wistoria!\n\nTry wws menu — view all subcommands.\nTry wws help — view all help guidelines.\n\nYour journey to Magia Vander begins here.`
      ), threadID, messageID);
      return;
    }

    let s = await getWWSData(db, senderID.toString());
    if (isDev && s.name) { applyDevBuff(s); await saveWWSData(db, senderID.toString(), s); }

    if (s.disabled && !isDev) {
      await api.sendMessage(styled("Wistoria", "🚫", "You are banned from using WWS commands."), threadID, messageID);
      return;
    }

    if (action === "menu") {
      await api.sendMessage(styled("WWS Menu", "📋",
        `🪄 WISTORIA: WAND AND SWORD\n\n` +
        `🔰 ACCOUNT\nregister <name> | status | profile <name> | changename <name>\n\n` +
        `⚔️ COMBAT\nbattle | duel <name> | spellcast | train | meditate\n\n` +
        `🔮 SPELLS\nspell list | spell learn <ID> | spell set <ID> | spell info <ID>\n\n` +
        `🗡️ WAND\nwand list | wand equip <ID> | wand info <ID> | wand upgrade <ID>\n\n` +
        `🏰 DUNGEON\ndungeon status | dungeon enter | dungeon party | dungeon party stop\ndungeon raid | dungeon leaderboard\n\n` +
        `🛍️ SHOP\nshop | shop wands | shop potions | shop accessories\nbuy <shopID> <qty> | sell <itemID> <qty> | inventory\n\n` +
        `📈 PROGRESSION\nrankup | rank | quest | daily | bond | achievement\n\n` +
        `🏛️ GUILD\nguild create <name> | guild join <name> | guild leave\nguild info | guild list | guild contribute\n\n` +
        `🎖️ TITLES & PROFILE\ntitle list | title set <ID> | lore | leaderboard\n\n` +
        `⚡ EVENTS\nsurge enter | surge start (admin)\n\n` +
        `📖 HELP\nhelp (3 pages)`
      ), threadID, messageID);
      return;
    }

    if (action === "help") {
      const page = parseInt(args[1]) || 1;
      const pages: Record<number, string> = {
        1: `📖 HELP — Page 1/3\n\n` +
           `▸ register <name>\n  Create your mage. You will choose a character from the anime cast.\n\n` +
           `▸ status\n  View your full mage profile: stats, wand, rank, floor progress.\n\n` +
           `▸ profile <name>\n  View another player's public profile.\n\n` +
           `▸ changename <name>\n  Change your mage display name.\n\n` +
           `▸ battle\n  Fight a random enemy. Gain EXP, silver, and magic power.\n  Cooldown: ${BATTLE_COOLDOWN}s\n\n` +
           `▸ duel <name>\n  Challenge another mage to a PvP duel. Winner steals 10% EXP.\n  Cooldown: ${DUEL_COOLDOWN}s\n\n` +
           `▸ spellcast\n  Unleash your active spell for bonus damage and rewards.\n\n` +
           `▸ train\n  Train your magic stats. Increases magic power and pen.\n  Cooldown: ${TRAIN_COOLDOWN}s\n\n` +
           `▸ meditate\n  Boost defense and luck through focused meditation.\n  Cooldown: 900s\n\n` +
           `▸ spell list\n  View all learnable spells with IDs, power, and cost.\n\n` +
           `▸ spell learn <ID>\n  Learn a spell. Requires enough rank and silver.\n\n` +
           `▸ spell set <ID>\n  Set your active spell for use in spellcast.\n\n` +
           `▸ spell info <ID>\n  View details about a specific spell.\n\n` +
           `Reply this with Page 2 or next to continue.`,

        2: `📖 HELP — Page 2/3\n\n` +
           `▸ wand list\n  View all owned wands and their stats.\n\n` +
           `▸ wand equip <ID>\n  Equip a wand from your inventory.\n\n` +
           `▸ wand info <ID>\n  View full stats of a wand.\n\n` +
           `▸ wand upgrade <ID>\n  Upgrade a wand (max Lv.${MAX_WAND_UPGRADE}). Costs silver.\n\n` +
           `▸ dungeon status\n  View your current dungeon floor and progress.\n\n` +
           `▸ dungeon enter\n  Solo: Enter and fight your current dungeon floor.\n\n` +
           `▸ dungeon party\n  Open a party lobby. Others reply "Dungeon Accept" to join.\n  Host uses dungeon party begin to start.\n\n` +
           `▸ dungeon party stop\n  Abort the party. All members keep their current floor.\n\n` +
           `▸ dungeon raid\n  Open a raid lobby (up to ${C.RAID_MAX_PARTICIPANTS} players). Harder, bigger rewards.\n\n` +
           `▸ shop\n  Main shop menu. Subcommands: shop wands / potions / accessories.\n\n` +
           `▸ buy <shopID> <qty>\n  Buy an item using its Shop ID (e.g. buy 3821 1).\n\n` +
           `▸ sell <itemID> <qty>\n  Sell an item for 50% of its value.\n\n` +
           `▸ inventory\n  View all items in your bag.\n\n` +
           `▸ rankup\n  Attempt to rank up. Requires enough EXP and magic power.\n\n` +
           `▸ rank\n  View your current mage rank and next rank requirements.\n\n` +
           `▸ quest\n  View active quests and progress.\n\n` +
           `▸ daily\n  Claim your daily reward. Streak multiplier up to 7x.\n\n` +
           `Reply this with Page 3 or next to continue.`,

        3: `📖 HELP — Page 3/3\n\n` +
           `▸ bond\n  Bond with your character for stat boosts.\n  Cooldown: ${BOND_COOLDOWN}s\n\n` +
           `▸ achievement\n  View all unlocked achievements/titles.\n\n` +
           `▸ guild create <name>\n  Found a Magic Guild. You become the founder.\n\n` +
           `▸ guild join <name>\n  Join an existing guild.\n\n` +
           `▸ guild leave\n  Leave your current guild.\n\n` +
           `▸ guild info\n  View your guild details and members.\n\n` +
           `▸ guild list\n  View top guilds by total power.\n\n` +
           `▸ guild contribute\n  Donate silver to your guild treasury.\n\n` +
           `▸ title list\n  View all titles and how to unlock them.\n\n` +
           `▸ title set <ID>\n  Equip a title you've unlocked.\n\n` +
           `▸ lore\n  Read lore entries about the world of Wistoria.\n\n` +
           `▸ leaderboard\n  Top 10 mages by magic power.\n\n` +
           `▸ surge enter\n  Claim an active Magic Surge event.\n\n` +
           `▸ surge start (Admin)\n  Trigger a Magic Surge in the chat.\n\n` +
           `🔐 ADMIN\nsetstat | givegold | givesilver | ban | unban\n\n` +
           `Reply this with Page 1 to go back to start.`,
      };
      const helpMsgInfo: any = await new Promise(resolve => {
        api.sendMessage(styled(`WWS Help — Page ${page}/3`, "📖", pages[page] || pages[1]),
          threadID, (err: any, info: any) => resolve(info), messageID);
      });
      const helpMsgID = helpMsgInfo?.messageID;
      if (!helpMsgID) return;
      global.registerEnkiduListener(helpMsgID, async ({ api, event: ev }: any) => {
        const body = ev.body?.toLowerCase().trim();
        let nextPage = page;
        if (body === "next")            nextPage = Math.min(3, page + 1);
        else if (body.startsWith("page ")) nextPage = parseInt(body.replace("page ", "")) || page;
        else return;
        if (!pages[nextPage]) return;
        global.replyListeners.delete(helpMsgID);
        await api.sendMessage(styled(`WWS Help — Page ${nextPage}/3`, "📖", pages[nextPage]),
          ev.threadID, ev.messageID);
      });
      return;
    }

    if (action === "register") {
      if (s.name) {
        await api.sendMessage(styled("Registration", "🛑", `Already registered as ${s.name}. Use wws status to check your profile.`), threadID, messageID);
        return;
      }
      const regName = args.slice(1).join(" ").trim();
      if (!regName || regName.length < 2 || regName.length > 30) {
        await api.sendMessage(styled("Registration", "⚠️", "Please provide a valid name (2–30 characters).\nUsage: wws register <name>"), threadID, messageID);
        return;
      }
      if (isDev) {
        s.name = regName;
        applyDevBuff(s);
        const nt = checkAndGrantTitles(s);
        await saveWWSData(db, senderID.toString(), s);
        await api.sendMessage(styled("Registration", "👑",
          `👑 DEVELOPER ACCOUNT — WILL SERFORT\n\nName: ${regName}\nCharacter: Will Serfort [XXSR]\nType: Sword\nSignature: ${s.signature}\n\nSword Power: 99,999,999 | Speed: 99,999,999\nDefense: 99,999,999 | Luck: 99,999,999\nSilver: 999,999,999 | Gold: 999,999\n\n⚠️ All spells, wands, titles, quests unlocked.${titleLine(nt)}`
        ), threadID, messageID);
        return;
      }
      const selectableChars = (CHARACTERS as any[]).filter((c: any) => !c.devOnly);
      const charList = selectableChars.map((c: any, i: number) =>
        `${i + 1}. ${c.name} [${c.rarity}] — ${c.type}\n   "${c.description.slice(0, 60)}..."\n   Signature: ${c.signature}`
      ).join("\n\n");
      const regMsgInfo: any = await new Promise(resolve => {
        api.sendMessage(styled("Registration", "🪄",
          `Welcome, ${regName}!\n\nChoose your character by replying with its number:\n\n${charList}\n\nDefault path: Magic (Wand)\nReply with a number to continue.`
        ), threadID, (err: any, info: any) => resolve(info), messageID);
      });
      const regMsgID = regMsgInfo?.messageID;
      if (!regMsgID) return;
      global.registerEnkiduListener(regMsgID, async ({ api, event: ev }: any) => {
        if (ev.senderID !== senderID) return;
        const choice = parseInt(ev.body?.trim());
        if (isNaN(choice) || choice < 1 || choice > selectableChars.length) {
          await api.sendMessage(styled("Registration", "⚠️", "Invalid choice. Reply with a number from the list."), ev.threadID, ev.messageID);
          return;
        }
        global.replyListeners.delete(regMsgID);
        const picked  = selectableChars[choice - 1];
        const fresh   = await getWWSData(db, ev.senderID);
        if (fresh.name) {
          await api.sendMessage(styled("Registration", "🛑", "Already registered."), ev.threadID, ev.messageID);
          return;
        }
        fresh.name          = regName;
        fresh.characterID   = picked.id;
        fresh.characterName = picked.name;
        fresh.rarity        = picked.rarity;
        fresh.type          = picked.type;
        fresh.signature     = picked.signature;
        fresh.stats = {
          magicPower: picked.baseStats.magicPower || 0,
          magicPen:   picked.baseStats.magicPen   || 0,
          swordPower: picked.baseStats.swordPower || 0,
          speed:      picked.baseStats.speed      || 0,
          defense:    picked.baseStats.defense    || 100,
          luck:       picked.baseStats.luck       || 100,
        };
        fresh.silver    = 500;
        fresh.gold      = 0;
        fresh.mageRank  = 1;
        fresh.spells    = ["SP01"];
        fresh.activeSpell = "SP01";
        fresh.quests    = initQuests(false);
        const nt = checkAndGrantTitles(fresh);
        await saveWWSData(db, ev.senderID, fresh);
        await api.sendMessage(styled("Registration Complete!", "✅",
          `Registration complete!\n\nName: ${regName}\nCharacter: ${picked.name} [${picked.rarity}]\nType: ${picked.type}\nSignature: ${picked.signature}\n\nMagic Power: ${fresh.stats.magicPower.toLocaleString()}\nMagic Pen: ${fresh.stats.magicPen.toLocaleString()}\nDefense: ${fresh.stats.defense} | Luck: ${fresh.stats.luck}\n\nStarting Silver: 500 🪙 | Starting Spell: Magic Bolt\n\nUse wws battle to begin!\nUse wws dungeon enter to explore the dungeon.${titleLine(nt)}`
        ), ev.threadID, ev.messageID);
      });
      return;
    }

    if (!s.name && action !== "register") {
      await api.sendMessage(styled("Wistoria", "⚠️", "You need to register first!\nUsage: wws register <name>"), threadID, messageID);
      return;
    }

    if (action === "status") {
      const power       = isDev ? "99,999,999+" : calcPower(s).toFixed(0);
      const rankData    = getRankData(s.mageRank);
      const activeTitle = s.activeTitle ? (TITLES.find((t: any) => t.id === s.activeTitle)?.label || "") : "";
      const wandInfo    = s.equippedWand ? `${(WANDS as any)[s.equippedWand]?.name || s.equippedWand} Lv.${s.wandUpgrades[s.equippedWand] || 0}` : "None";
      const activeSpell = s.activeSpell  ? ((SPELLS as any)[s.activeSpell]?.name || s.activeSpell) : "None";
      const nextFloor   = s.dungeonFloor < 100 ? `Next Floor: ${s.dungeonFloor + 1}` : "All floors cleared! ✅";
      await api.sendMessage(styled("Mage Status", "🪄",
        `${activeTitle ? activeTitle + "\n" : ""}👤 ${s.name} ${isDev ? "👑 [DEVELOPER]" : ""}
📛 Character: ${s.characterName || "—"} [${s.rarity || "—"}]
✨ Type: ${s.type || "—"}
🌟 Signature: ${s.signature || "—"}

📊 STATS
  Magic Power: ${Number(s.stats.magicPower).toLocaleString()}
  Magic Pen:   ${Number(s.stats.magicPen).toLocaleString()}
  Defense:     ${Number(s.stats.defense).toLocaleString()}
  Luck:        ${Number(s.stats.luck).toLocaleString()}
  ${s.type === "Sword" ? `Sword Power: ${Number(s.stats.swordPower).toLocaleString()}\n  Speed: ${Number(s.stats.speed).toLocaleString()}` : ""}
  Total Power: ${power}

🎖️ Level: ${s.level} | EXP: ${s.exp.toLocaleString()}
🏅 Mage Rank: ${s.mageRank}/${MAX_RANK} — ${rankData.name}
💛 Bond Level: ${s.bondLevel}
🔮 Active Spell: ${activeSpell}
🪄 Equipped Wand: ${wandInfo}

🪙 Silver: ${s.silver.toLocaleString()}
💰 Gold Coins: ${s.gold.toLocaleString()}
🏛️ Guild: ${s.guild || "None"}

🏰 Dungeon Floor Reached: ${s.dungeonFloor}
${nextFloor}
⚔️ Battle Wins: ${s.totalBattleWins.toLocaleString()}
🥊 Duel Wins: ${s.totalDuelWins.toLocaleString()}
🗝️ Dungeon Clears: ${s.totalDungeonClears.toLocaleString()}
📚 Spells Known: ${s.spells.length}/${Object.keys(SPELLS).length}`
      ), threadID, messageID);
      return;
    }

    if (action === "profile") {
      const targetName = args.slice(1).join(" ").trim();
      if (!targetName) { await api.sendMessage(styled("Profile", "⚠️", "Usage: wws profile <name>"), threadID, messageID); return; }
      const target = await db.db("wws_players").findOne({ name: targetName });
      if (!target?.name) { await api.sendMessage(styled("Profile", "❌", `Mage "${targetName}" not found.`), threadID, messageID); return; }
      const t        = target as WWSData;
      const rk       = getRankData(t.mageRank || 1);
      const atitle   = t.activeTitle ? (TITLES.find((tt: any) => tt.id === t.activeTitle)?.label || "") : "";
      const tPower   = isDevUser(t.userID) ? "99,999,999+" : calcPower(t).toFixed(0);
      await api.sendMessage(styled("Mage Profile", "👤",
        `${atitle ? atitle + "\n" : ""}👤 ${t.name}\nCharacter: ${t.characterName || "—"} [${t.rarity || "—"}]\nRank: ${t.mageRank}/${MAX_RANK} — ${rk.name}\nLevel: ${t.level} | Power: ${tPower}\nDungeon Floor: ${t.dungeonFloor}\nBattle Wins: ${t.totalBattleWins} | Duel Wins: ${t.totalDuelWins}\nGuild: ${t.guild || "None"}`
      ), threadID, messageID);
      return;
    }

    if (action === "changename") {
      const newName = args.slice(1).join(" ").trim();
      if (!newName || newName.length < 2 || newName.length > 30) { await api.sendMessage(styled("Change Name", "⚠️", "Usage: wws changename <new name> (2–30 characters)"), threadID, messageID); return; }
      const old = s.name; s.name = newName;
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Change Name", "✅", `Name changed: ${old} → ${newName}`), threadID, messageID);
      return;
    }

    if (action === "battle") {
      const cd = isDev ? 0 : BATTLE_COOLDOWN;
      if (!isDev && s.battleCooldown > currentTime) {
        const rem = s.battleCooldown - currentTime;
        await api.sendMessage(styled("Battle", "⏳", `Battle cooldown: ${rem}s remaining.`), threadID, messageID); return;
      }
      const floor   = Math.max(1, s.dungeonFloor);
      const dFloor  = (DUNGEONS as any[])[Math.min(floor - 1, 99)];
      const myPow   = isDev ? 99999999 : calcPower(s) * (0.85 + Math.random() * 0.3);
      const enemyPow = dFloor.enemyPower * 0.3 * (0.85 + Math.random() * 0.3);
      const win     = isDev || myPow > enemyPow;
      const expGain = win ? Math.floor(dFloor.expReward * 0.3) + Math.floor(Math.random() * 100) : Math.floor(dFloor.expReward * 0.08);
      const silGain = win ? Math.floor(dFloor.silverReward * 0.25) + Math.floor(Math.random() * 50) : Math.floor(dFloor.silverReward * 0.05);
      const goldDrop = win && (Math.random() < GOLD_DROP_CHANCE || isDev) ? (isDev ? 5 : Math.floor(Math.random() * C.GOLD_DROP_AMOUNT_MAX) + C.GOLD_DROP_AMOUNT_MIN) : 0;
      s.exp    = (s.exp    || 0) + expGain;
      s.level  = calcLevel(s.exp);
      s.silver = (s.silver || 0) + silGain;
      s.gold   = (s.gold   || 0) + goldDrop;
      if (win) {
        s.totalBattleWins = (s.totalBattleWins || 0) + 1;
        s.stats.magicPower = Math.floor((s.stats.magicPower || 0) + 20 + (s.mageRank || 1) * 5);
        s.stats.magicPen   = Math.floor((s.stats.magicPen   || 0) + 8  + (s.mageRank || 1) * 2);
      }
      s.battleCooldown = currentTime + cd;
      const qr  = win ? updateQuestProgress(s, "battle") : { silver: 0, gold: 0, exp: 0, completed: [] };
      const nt  = checkAndGrantTitles(s);
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Battle", win ? "⚔️" : "💥",
        `${win ? "⚔️ VICTORY!" : "💥 DEFEAT!"}\n\n${s.name} [${s.characterName}] vs ${dFloor.enemyName}\nYour Power: ${isDev ? "99M+" : myPow.toFixed(0)} | Enemy: ${enemyPow.toFixed(0)}\n\n${win
          ? `+${expGain} EXP | +${silGain} 🪙 | ${goldDrop > 0 ? `+${goldDrop} 💰 Gold!` : ""}\n+20 Magic Power | +8 Magic Pen`
          : `+${expGain} EXP (consolation) | +${silGain} 🪙`
        }\nLevel: ${s.level}${questRewardLine(qr)}${titleLine(nt)}`
      ), threadID, messageID);
      return;
    }

    if (action === "duel") {
      const targetName = args.slice(1).join(" ").trim();
      if (!targetName) { await api.sendMessage(styled("Duel", "⚠️", "Usage: wws duel <name>"), threadID, messageID); return; }
      if (!isDev && s.duelCooldown > currentTime) {
        const rem = s.duelCooldown - currentTime;
        await api.sendMessage(styled("Duel", "⏳", `Duel cooldown: ${rem}s remaining.`), threadID, messageID); return;
      }
      const col    = db.db("wws_players");
      const target = await col.findOne({ name: targetName });
      if (!target?.name) { await api.sendMessage(styled("Duel", "❌", `Mage "${targetName}" not found.`), threadID, messageID); return; }
      if (target.userID === senderID.toString()) { await api.sendMessage(styled("Duel", "⚠️", "You cannot duel yourself!"), threadID, messageID); return; }
      const myPow = isDev ? 99999999 : calcPower(s) * (0.85 + Math.random() * 0.3);
      const thPow = isDevUser(target.userID) ? 99999999 : calcPower(target as WWSData) * (0.85 + Math.random() * 0.3);
      const win   = myPow > thPow;
      if (win) {
        const stake = Math.floor(Math.max(0, Number(target.exp) || 0) * 0.10);
        s.exp  = (s.exp || 0) + stake;
        s.level = calcLevel(s.exp);
        s.totalDuelWins = (s.totalDuelWins || 0) + 1;
        await col.updateOne({ userID: target.userID }, { $set: { exp: Math.max(0, (Number(target.exp) || 0) - stake) } });
      } else {
        const lost = Math.floor((s.exp || 0) * 0.05);
        s.exp   = Math.max(0, (s.exp || 0) - lost);
        s.level = calcLevel(s.exp);
      }
      s.duelCooldown = currentTime + (isDev ? 0 : DUEL_COOLDOWN);
      const qr = win ? updateQuestProgress(s, "duel") : { silver: 0, gold: 0, exp: 0, completed: [] };
      const nt = checkAndGrantTitles(s);
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Duel", win ? "⚔️" : "💥",
        `⚔️ DUEL RESULT\n${s.name} [${s.characterName}] (${myPow.toFixed(0)}) vs ${targetName} [${(target as WWSData).characterName}] (${thPow.toFixed(0)})\n\n${win
          ? `VICTORY! Stole ${Math.floor(Number(target.exp) * 0.10).toLocaleString()} EXP from ${targetName}.`
          : `DEFEAT! Lost ${Math.floor((s.exp || 0) * 0.05).toLocaleString()} EXP.`
        }\nLevel: ${s.level}${questRewardLine(qr)}${titleLine(nt)}`
      ), threadID, messageID);
      return;
    }

    if (action === "train") {
      const cd = isDev ? 0 : TRAIN_COOLDOWN;
      if (!isDev && s.trainCooldown > currentTime) {
        const rem = s.trainCooldown - currentTime;
        await api.sendMessage(styled("Training", "⏳", `Training cooldown: ${Math.ceil(rem / 60)} minutes remaining.`), threadID, messageID); return;
      }
      const boost = isDev ? 9999 : 50 + (s.mageRank || 1) * 15;
      const penBst = isDev ? 9999 : 20 + (s.mageRank || 1) * 6;
      s.stats.magicPower = (s.stats.magicPower || 0) + boost;
      s.stats.magicPen   = (s.stats.magicPen   || 0) + penBst;
      const expGain = isDev ? 99999 : 300 + (s.mageRank || 1) * 80;
      s.exp   = (s.exp || 0) + expGain;
      s.level = calcLevel(s.exp);
      s.trainCooldown = currentTime + cd;
      const nt = checkAndGrantTitles(s);
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Magic Training", "🔮",
        `Training session complete!\n\n+${boost} Magic Power | +${penBst} Magic Pen\n+${expGain} EXP\n\nMagic Power: ${s.stats.magicPower.toLocaleString()}\nMagic Pen: ${s.stats.magicPen.toLocaleString()}\nLevel: ${s.level}${titleLine(nt)}`
      ), threadID, messageID);
      return;
    }

    if (action === "meditate") {
      const MEDITATE_CD = 900;
      const cdKey = s.bondCooldown;
      if (!isDev && cdKey > currentTime) {
        const rem = cdKey - currentTime;
        await api.sendMessage(styled("Meditate", "⏳", `Meditation cooldown: ${Math.ceil(rem / 60)} minutes remaining.`), threadID, messageID); return;
      }
      const defBst  = isDev ? 9999 : 40 + (s.mageRank || 1) * 10;
      const luckBst = isDev ? 9999 : 20 + (s.mageRank || 1) * 5;
      s.stats.defense = (s.stats.defense || 0) + defBst;
      s.stats.luck    = (s.stats.luck    || 0) + luckBst;
      s.bondCooldown  = currentTime + (isDev ? 0 : MEDITATE_CD);
      const nt = checkAndGrantTitles(s);
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Meditation", "🧘",
        `Meditation complete!\n\n+${defBst} Defense | +${luckBst} Luck\n\nDefense: ${s.stats.defense.toLocaleString()}\nLuck: ${s.stats.luck.toLocaleString()}${titleLine(nt)}`
      ), threadID, messageID);
      return;
    }

    if (action === "spellcast") {
      if (!s.activeSpell || !(SPELLS as any)[s.activeSpell]) {
        await api.sendMessage(styled("Spell Cast", "⚠️", "No active spell set! Use wws spell set <ID> first."), threadID, messageID); return;
      }
      const sp    = (SPELLS as any)[s.activeSpell];
      const mult  = s.spellAmpCharges > 0 ? sp.powerMult * 2 : sp.powerMult;
      const dmg   = isDev ? "99,999,999" : Math.floor(calcPower(s) * mult * (0.9 + Math.random() * 0.2)).toLocaleString();
      const amp   = s.spellAmpCharges > 0;
      if (amp && !isDev) s.spellAmpCharges = Math.max(0, s.spellAmpCharges - 1);
      const expGain = isDev ? 99999 : Math.floor(calcPower(s) * 0.05 * sp.powerMult);
      const silGain = isDev ? 99999 : Math.floor(100 * sp.powerMult * (s.mageRank || 1));
      s.exp    = (s.exp    || 0) + expGain;
      s.level  = calcLevel(s.exp);
      s.silver = (s.silver || 0) + silGain;
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Spell Cast", "✨",
        `✨ ${sp.name} ✨\nElement: ${sp.element}\n\n${s.name} unleashes ${sp.name}!\n\n💫 DAMAGE: ${dmg}\n${amp ? "⚡ AMPLIFIED! (2× damage!)" : ""}\n\n+${expGain} EXP | +${silGain} 🪙`
      ), threadID, messageID);
      return;
    }

    if (action === "bond") {
      const cd = isDev ? 0 : BOND_COOLDOWN;
      if (!isDev && s.bondCooldown > currentTime) {
        const rem = s.bondCooldown - currentTime;
        await api.sendMessage(styled("Bond", "⏳", `Bond cooldown: ${Math.ceil(rem / 60)} min remaining.`), threadID, messageID); return;
      }
      const gain = isDev ? 5 : 1;
      s.bondLevel = (s.bondLevel || 0) + gain;
      s.stats.magicPower = Math.floor((s.stats.magicPower || 0) * 1.02);
      s.stats.magicPen   = Math.floor((s.stats.magicPen   || 0) * 1.02);
      s.stats.defense    = Math.floor((s.stats.defense    || 0) * 1.02);
      s.stats.luck       = Math.floor((s.stats.luck       || 0) * 1.02);
      s.bondCooldown     = currentTime + cd;
      const nt = checkAndGrantTitles(s);
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Bond Training", "💛",
        `Bond with ${s.characterName} deepened!\nBond Level: ${s.bondLevel}\n\nAll stats +2%\nMagic Power: ${s.stats.magicPower.toLocaleString()} | Magic Pen: ${s.stats.magicPen.toLocaleString()}\nDefense: ${s.stats.defense.toLocaleString()} | Luck: ${s.stats.luck.toLocaleString()}${titleLine(nt)}`
      ), threadID, messageID);
      return;
    }

    if (action === "spell") {
      const spSub = args[1]?.toLowerCase();
      if (!spSub || spSub === "list") {
        const list = Object.entries(SPELLS).map(([id, sp]: [string, any]) =>
          `${(s.spells || []).includes(id) ? "✅" : "🔒"} [${id}] ${sp.name} [${sp.element}]\n   Rank Req: ${sp.rankRequired} | Power: ${sp.powerMult}× | Cost: ${sp.cost.silver.toLocaleString()} 🪙${sp.cost.gold > 0 ? ` + ${sp.cost.gold} 💰` : ""}`
        ).join("\n");
        await api.sendMessage(styled("Spell List", "📚",
          `Your Spells: ${(s.spells || []).length}/${Object.keys(SPELLS).length}\n\n${list}\n\nLearn: wws spell learn <ID>\nSet active: wws spell set <ID>`
        ), threadID, messageID); return;
      }
      if (spSub === "learn") {
        const spID = args[2]?.toUpperCase();
        if (!spID || !(SPELLS as any)[spID]) { await api.sendMessage(styled("Spell", "⚠️", "Usage: wws spell learn <ID>\nSee wws spell list for IDs."), threadID, messageID); return; }
        if ((s.spells || []).includes(spID)) { await api.sendMessage(styled("Spell", "⚠️", `Already know ${(SPELLS as any)[spID].name}!`), threadID, messageID); return; }
        const sp   = (SPELLS as any)[spID];
        if (!isDev && (s.mageRank || 1) < sp.rankRequired) {
          await api.sendMessage(styled("Spell", "❌", `Rank too low! ${sp.name} requires Rank ${sp.rankRequired}. Your rank: ${s.mageRank}.`), threadID, messageID); return;
        }
        const cost = isDev ? { silver: 0, gold: 0 } : sp.cost;
        if (s.silver < cost.silver || s.gold < cost.gold) {
          await api.sendMessage(styled("Spell", "❌", `Not enough resources! Need ${cost.silver.toLocaleString()} 🪙${cost.gold > 0 ? ` + ${cost.gold} 💰` : ""}.\nYou have: ${s.silver.toLocaleString()} 🪙 | ${s.gold} 💰`), threadID, messageID); return;
        }
        if (!isDev) { s.silver -= cost.silver; s.gold -= cost.gold; }
        s.spells = [...(s.spells || []), spID];
        if (!s.activeSpell) s.activeSpell = spID;
        const qr = updateQuestProgress(s, "spell");
        const nt = checkAndGrantTitles(s);
        await saveWWSData(db, senderID.toString(), s);
        await api.sendMessage(styled("Spell Learned", "✨", `Spell unlocked: ${sp.name} [${sp.element}]\nPower: ${sp.powerMult}×\n${sp.description}${questRewardLine(qr)}${titleLine(nt)}`), threadID, messageID); return;
      }
      if (spSub === "set") {
        const spID = args[2]?.toUpperCase();
        if (!spID || !(SPELLS as any)[spID]) { await api.sendMessage(styled("Spell", "⚠️", "Usage: wws spell set <ID>"), threadID, messageID); return; }
        if (!(s.spells || []).includes(spID) && !isDev) { await api.sendMessage(styled("Spell", "❌", `You haven't learned ${(SPELLS as any)[spID].name} yet!`), threadID, messageID); return; }
        s.activeSpell = spID;
        await saveWWSData(db, senderID.toString(), s);
        await api.sendMessage(styled("Spell", "✅", `Active spell set: ${(SPELLS as any)[spID].name} [${(SPELLS as any)[spID].element}]`), threadID, messageID); return;
      }
      if (spSub === "info") {
        const spID = args[2]?.toUpperCase();
        if (!spID || !(SPELLS as any)[spID]) { await api.sendMessage(styled("Spell Info", "⚠️", "Usage: wws spell info <ID>"), threadID, messageID); return; }
        const sp = (SPELLS as any)[spID];
        await api.sendMessage(styled(`Spell: ${sp.name}`, "📖",
          `[${spID}] ${sp.name}\nElement: ${sp.element}\nPower Multiplier: ${sp.powerMult}×\nRank Required: ${sp.rankRequired}\nCost: ${sp.cost.silver.toLocaleString()} 🪙${sp.cost.gold > 0 ? ` + ${sp.cost.gold} 💰` : ""}\n\n${sp.description}\n\nStatus: ${(s.spells || []).includes(spID) ? "✅ Learned" : "🔒 Not Learned"}`
        ), threadID, messageID); return;
      }
      await api.sendMessage(styled("Spell", "⚠️", "Usage: wws spell list | wws spell learn <ID> | wws spell set <ID> | wws spell info <ID>"), threadID, messageID); return;
    }

    if (action === "wand") {
      const wSub = args[1]?.toLowerCase();
      if (!wSub || wSub === "list") {
        const owned = Object.entries(s.inventory.wands).map(([id, w]) =>
          `${s.equippedWand === id ? "🟢" : "⬜"} [${id}] ${w.name} Lv.${s.wandUpgrades[id] || 0}/${MAX_WAND_UPGRADE}`
        ).join("\n") || "None";
        await api.sendMessage(styled("Wand List", "🪄", `Owned Wands:\n\n${owned}\n\nEquip: wws wand equip <ID>\nUpgrade: wws wand upgrade <ID>\nInfo: wws wand info <ID>`), threadID, messageID); return;
      }
      if (wSub === "equip") {
        const wID = args[2]?.toUpperCase();
        if (!wID) { await api.sendMessage(styled("Wand", "⚠️", "Usage: wws wand equip <ID>"), threadID, messageID); return; }
        if (!s.inventory.wands[wID] && !isDev) { await api.sendMessage(styled("Wand", "❌", `You don't own wand [${wID}]. Buy from shop first.`), threadID, messageID); return; }
        s.equippedWand = wID;
        await saveWWSData(db, senderID.toString(), s);
        await api.sendMessage(styled("Wand", "✅", `Equipped: ${(WANDS as any)[wID]?.name || wID}`), threadID, messageID); return;
      }
      if (wSub === "info") {
        const wID = args[2]?.toUpperCase();
        if (!wID || !(WANDS as any)[wID]) { await api.sendMessage(styled("Wand Info", "⚠️", "Usage: wws wand info <ID>"), threadID, messageID); return; }
        const w = (WANDS as any)[wID];
        await api.sendMessage(styled(`Wand: ${w.name}`, "🪄",
          `[${wID}] ${w.name}\nMagic Power: +${w.magicPower.toLocaleString()}\nMagic Pen: +${w.magicPen.toLocaleString()}\nMax Upgrade: Lv.${w.maxUpgrade}\nCost: ${w.cost.silver.toLocaleString()} 🪙${w.cost.gold > 0 ? ` + ${w.cost.gold} 💰` : ""}\nShop ID: ${w.shopId}\n\n${w.desc}\n\nStatus: ${s.inventory.wands[wID] ? `Owned (Lv.${s.wandUpgrades[wID] || 0})` : "Not Owned"}`
        ), threadID, messageID); return;
      }
      if (wSub === "upgrade") {
        const wID = args[2]?.toUpperCase();
        if (!wID || !(WANDS as any)[wID]) { await api.sendMessage(styled("Wand", "⚠️", "Usage: wws wand upgrade <ID>"), threadID, messageID); return; }
        if (!s.inventory.wands[wID] && !isDev) { await api.sendMessage(styled("Wand", "❌", `You don't own wand [${wID}].`), threadID, messageID); return; }
        const curLvl = s.wandUpgrades[wID] || 0;
        if (curLvl >= MAX_WAND_UPGRADE) { await api.sendMessage(styled("Wand", "🔱", `${(WANDS as any)[wID].name} is already MAX level (${MAX_WAND_UPGRADE})!`), threadID, messageID); return; }
        const w       = (WANDS as any)[wID];
        const upgCost = isDev ? 0 : Math.floor(w.cost.silver * 0.25 * (curLvl + 1));
        if (s.silver < upgCost) { await api.sendMessage(styled("Wand", "❌", `Not enough Silver! Need ${upgCost.toLocaleString()} 🪙. You have: ${s.silver.toLocaleString()} 🪙`), threadID, messageID); return; }
        if (!isDev) s.silver -= upgCost;
        s.wandUpgrades[wID]      = curLvl + 1;
        s.inventory.wands[wID]   = { name: w.name, level: curLvl + 1 };
        const bonus = 0.1 * (curLvl + 1);
        const mpAdd = Math.floor(w.magicPower * bonus);
        const penAdd = Math.floor(w.magicPen  * bonus);
        s.stats.magicPower = (s.stats.magicPower || 0) + mpAdd;
        s.stats.magicPen   = (s.stats.magicPen   || 0) + penAdd;
        const nt = checkAndGrantTitles(s);
        await saveWWSData(db, senderID.toString(), s);
        await api.sendMessage(styled("Wand Upgrade", "🔱",
          `${w.name} upgraded to Lv.${s.wandUpgrades[wID]}/${MAX_WAND_UPGRADE}!\n\n+${mpAdd} Magic Power | +${penAdd} Magic Pen\nCost: ${upgCost.toLocaleString()} 🪙\nSilver remaining: ${s.silver.toLocaleString()} 🪙${titleLine(nt)}`
        ), threadID, messageID); return;
      }
      await api.sendMessage(styled("Wand", "⚠️", "Usage: wws wand list | equip <ID> | info <ID> | upgrade <ID>"), threadID, messageID); return;
    }

    if (action === "shop") {
      const shopSub = args[1]?.toLowerCase();

      const buildWandLines = () => Object.entries(WANDS).map(([id, w]: [string, any]) =>
        `[${w.shopId}] ${w.name} [${id}]\n  Magic Power +${w.magicPower.toLocaleString()} | Pen +${w.magicPen.toLocaleString()}\n  Cost: ${w.cost.silver.toLocaleString()} 🪙${w.cost.gold > 0 ? ` + ${w.cost.gold} 💰` : ""}`
      ).join("\n\n");

      const buildPotionLines = () => Object.entries(POTIONS).map(([id, p]: [string, any]) =>
        `[${p.shopId}] ${p.name} [${id}]\n  ${p.desc}\n  Cost: ${p.cost.silver.toLocaleString()} 🪙${p.cost.gold > 0 ? ` + ${p.cost.gold} 💰` : ""}`
      ).join("\n\n");

      const buildAccLines = () => Object.entries(ACCESSORIES).map(([id, a]: [string, any]) =>
        `[${a.shopId}] ${a.name} [${id}]\n  ${a.desc}\n  Cost: ${a.cost.silver.toLocaleString()} 🪙${a.cost.gold > 0 ? ` + ${a.cost.gold} 💰` : ""}`
      ).join("\n\n");

      if (shopSub === "wands") {
        const wandMsgInfo: any = await new Promise(resolve => {
          api.sendMessage(styled("Wand Shop", "🪄",
            `🪙 Silver: ${s.silver.toLocaleString()} | 💰 Gold: ${s.gold}\n\n${buildWandLines()}\n\n━━━━━━━━━━━━━━━━━\nReply: buy <shopID> 1\nExample: buy 3821 1`
          ), threadID, (err: any, info: any) => resolve(info), messageID);
        });
        const wandMsgID = wandMsgInfo?.messageID;
        if (!wandMsgID) return;
        global.registerEnkiduListener(wandMsgID, async ({ api, event: ev }: any) => {
          if (ev.senderID !== senderID) return;
          const parts = ev.body?.trim().toLowerCase().split(/\s+/);
          if (parts?.[0] !== "buy") return;
          const shopId = parts?.[1]; const qty = parseInt(parts?.[2]) || 1;
          if (!shopId) { await api.sendMessage(styled("Shop", "⚠️", "Format: buy <shopID> <qty>"), ev.threadID, ev.messageID); return; }
          const wEntry = Object.entries(WANDS).find(([, w]: [string, any]) => w.shopId === shopId);
          if (!wEntry) { await api.sendMessage(styled("Shop", "❌", `Shop ID "${shopId}" not found.`), ev.threadID, ev.messageID); return; }
          const [wID, w] = wEntry as [string, any];
          const fresh = await getWWSData(db, senderID.toString());
          const dev2  = isDevUser(senderID.toString());
          const cost  = { silver: dev2 ? 0 : w.cost.silver, gold: dev2 ? 0 : w.cost.gold };
          if (fresh.silver < cost.silver || fresh.gold < cost.gold) {
            await api.sendMessage(styled("Shop", "❌", `Not enough! Need ${w.cost.silver.toLocaleString()} 🪙${w.cost.gold > 0 ? ` + ${w.cost.gold} 💰` : ""}.\nYou: ${fresh.silver.toLocaleString()} 🪙 | ${fresh.gold} 💰`), ev.threadID, ev.messageID); return;
          }
          if (!dev2) { fresh.silver -= cost.silver; fresh.gold -= cost.gold; }
          fresh.inventory.wands[wID] = { name: w.name, level: fresh.wandUpgrades[wID] || 0 };
          fresh.stats.magicPower = (fresh.stats.magicPower || 0) + w.magicPower;
          fresh.stats.magicPen   = (fresh.stats.magicPen   || 0) + w.magicPen;
          if (!fresh.equippedWand) fresh.equippedWand = wID;
          const qr2 = updateQuestProgress(fresh, "shop");
          const nt2 = checkAndGrantTitles(fresh);
          await saveWWSData(db, senderID.toString(), fresh);
          await api.sendMessage(styled("Shop", "✅",
            `Purchased: ${w.name} [${wID}]\n+${w.magicPower.toLocaleString()} Magic Power | +${w.magicPen.toLocaleString()} Magic Pen\nSilver: ${fresh.silver.toLocaleString()} 🪙 | Gold: ${fresh.gold} 💰${questRewardLine(qr2)}${titleLine(nt2)}\n\nReply with buy <shopID> 1 to purchase more.`
          ), ev.threadID, ev.messageID);
        });
        return;
      }

      if (shopSub === "potions") {
        const potMsgInfo: any = await new Promise(resolve => {
          api.sendMessage(styled("Potion Shop", "🧪",
            `🪙 Silver: ${s.silver.toLocaleString()} | 💰 Gold: ${s.gold}\n\n${buildPotionLines()}\n\n━━━━━━━━━━━━━━━━━\nReply: buy <shopID> <qty>\nExample: buy 6671 3`
          ), threadID, (err: any, info: any) => resolve(info), messageID);
        });
        const potMsgID = potMsgInfo?.messageID;
        if (!potMsgID) return;
        global.registerEnkiduListener(potMsgID, async ({ api, event: ev }: any) => {
          if (ev.senderID !== senderID) return;
          const parts = ev.body?.trim().toLowerCase().split(/\s+/);
          if (parts?.[0] !== "buy") return;
          const shopId = parts?.[1]; const qty = parseInt(parts?.[2]) || 1;
          if (!shopId) { await api.sendMessage(styled("Shop", "⚠️", "Format: buy <shopID> <qty>"), ev.threadID, ev.messageID); return; }
          const pEntry = Object.entries(POTIONS).find(([, p]: [string, any]) => p.shopId === shopId);
          if (!pEntry) { await api.sendMessage(styled("Shop", "❌", `Shop ID "${shopId}" not found.`), ev.threadID, ev.messageID); return; }
          const [pID, p] = pEntry as [string, any];
          const fresh = await getWWSData(db, senderID.toString());
          const dev2  = isDevUser(senderID.toString());
          const totalSilver = dev2 ? 0 : p.cost.silver * qty;
          const totalGold   = dev2 ? 0 : p.cost.gold   * qty;
          if (fresh.silver < totalSilver || fresh.gold < totalGold) {
            await api.sendMessage(styled("Shop", "❌", `Not enough resources for ×${qty}!\nNeed ${totalSilver.toLocaleString()} 🪙${totalGold > 0 ? ` + ${totalGold} 💰` : ""}.\nYou: ${fresh.silver.toLocaleString()} 🪙 | ${fresh.gold} 💰`), ev.threadID, ev.messageID); return;
          }
          if (!dev2) { fresh.silver -= totalSilver; fresh.gold -= totalGold; }
          fresh.inventory.potions[pID] = (fresh.inventory.potions[pID] || 0) + qty;
          await saveWWSData(db, senderID.toString(), fresh);
          await api.sendMessage(styled("Shop", "✅",
            `Purchased: ${p.name} ×${qty}\nSilver: ${fresh.silver.toLocaleString()} 🪙\n\nReply with buy <shopID> <qty> to purchase more.`
          ), ev.threadID, ev.messageID);
        });
        return;
      }

      if (shopSub === "accessories") {
        const accMsgInfo: any = await new Promise(resolve => {
          api.sendMessage(styled("Accessory Shop", "💍",
            `🪙 Silver: ${s.silver.toLocaleString()} | 💰 Gold: ${s.gold}\n\n${buildAccLines()}\n\n━━━━━━━━━━━━━━━━━\nReply: buy <shopID> 1`
          ), threadID, (err: any, info: any) => resolve(info), messageID);
        });
        const accMsgID = accMsgInfo?.messageID;
        if (!accMsgID) return;
        global.registerEnkiduListener(accMsgID, async ({ api, event: ev }: any) => {
          if (ev.senderID !== senderID) return;
          const parts = ev.body?.trim().toLowerCase().split(/\s+/);
          if (parts?.[0] !== "buy") return;
          const shopId = parts?.[1];
          if (!shopId) { await api.sendMessage(styled("Shop", "⚠️", "Format: buy <shopID> 1"), ev.threadID, ev.messageID); return; }
          const aEntry = Object.entries(ACCESSORIES).find(([, a]: [string, any]) => a.shopId === shopId);
          if (!aEntry) { await api.sendMessage(styled("Shop", "❌", `Shop ID "${shopId}" not found.`), ev.threadID, ev.messageID); return; }
          const [aID, a] = aEntry as [string, any];
          const fresh = await getWWSData(db, senderID.toString());
          const dev2  = isDevUser(senderID.toString());
          if (!dev2 && (fresh.silver < a.cost.silver || fresh.gold < a.cost.gold)) {
            await api.sendMessage(styled("Shop", "❌", `Not enough! Need ${a.cost.silver.toLocaleString()} 🪙${a.cost.gold > 0 ? ` + ${a.cost.gold} 💰` : ""}.`), ev.threadID, ev.messageID); return;
          }
          if (!dev2) { fresh.silver -= a.cost.silver; fresh.gold -= a.cost.gold; }
          fresh.inventory.accessories[aID] = (fresh.inventory.accessories[aID] || 0) + 1;
          if (a.magicPower) fresh.stats.magicPower = (fresh.stats.magicPower || 0) + (a.magicPower || 0);
          if (a.magicPen)   fresh.stats.magicPen   = (fresh.stats.magicPen   || 0) + (a.magicPen   || 0);
          if (a.defense)    fresh.stats.defense    = (fresh.stats.defense    || 0) + (a.defense    || 0);
          if (a.luck)       fresh.stats.luck       = (fresh.stats.luck       || 0) + (a.luck       || 0);
          const nt2 = checkAndGrantTitles(fresh);
          await saveWWSData(db, senderID.toString(), fresh);
          await api.sendMessage(styled("Shop", "✅",
            `Purchased: ${a.name}\n${a.desc}\nSilver: ${fresh.silver.toLocaleString()} 🪙 | Gold: ${fresh.gold} 💰${titleLine(nt2)}`
          ), ev.threadID, ev.messageID);
        });
        return;
      }

      await api.sendMessage(styled("WWS Shop", "🛍️",
        `🪙 Silver: ${s.silver.toLocaleString()} | 💰 Gold: ${s.gold}\n\n🪄 wws shop wands — Browse 30 wands with Shop IDs\n🧪 wws shop potions — Browse potions\n💍 wws shop accessories — Browse accessories\n\nTo buy directly: wws buy <shopID> <qty>\nShop IDs are shown in brackets like [3821].`
      ), threadID, messageID);
      return;
    }

    if (action === "buy") {
      const shopId = args[1];
      const qty    = parseInt(args[2]) || 1;
      if (!shopId || qty <= 0) { await api.sendMessage(styled("Buy", "⚠️", "Usage: wws buy <shopID> <qty>\nExample: wws buy 3821 1"), threadID, messageID); return; }
      const wEntry = Object.entries(WANDS).find(([, w]: [string, any]) => w.shopId === shopId);
      const pEntry = Object.entries(POTIONS).find(([, p]: [string, any]) => p.shopId === shopId);
      const aEntry = Object.entries(ACCESSORIES).find(([, a]: [string, any]) => a.shopId === shopId);
      const entry  = wEntry || pEntry || aEntry;
      if (!entry) { await api.sendMessage(styled("Buy", "❌", `Shop ID "${shopId}" not found.\nUse wws shop to browse items.`), threadID, messageID); return; }
      const [itemID, item] = entry as [string, any];
      const totalSilver = isDev ? 0 : item.cost.silver * qty;
      const totalGold   = isDev ? 0 : item.cost.gold   * qty;
      if (s.silver < totalSilver || s.gold < totalGold) {
        await api.sendMessage(styled("Buy", "❌", `Not enough! Need ${totalSilver.toLocaleString()} 🪙${totalGold > 0 ? ` + ${totalGold} 💰` : ""}.`), threadID, messageID); return;
      }
      if (!isDev) { s.silver -= totalSilver; s.gold -= totalGold; }
      if (wEntry) {
        s.inventory.wands[itemID] = { name: item.name, level: s.wandUpgrades[itemID] || 0 };
        s.stats.magicPower = (s.stats.magicPower || 0) + item.magicPower;
        s.stats.magicPen   = (s.stats.magicPen   || 0) + item.magicPen;
        if (!s.equippedWand) s.equippedWand = itemID;
      } else if (pEntry) {
        s.inventory.potions[itemID] = (s.inventory.potions[itemID] || 0) + qty;
      } else if (aEntry) {
        s.inventory.accessories[itemID] = (s.inventory.accessories[itemID] || 0) + qty;
        if (item.magicPower) s.stats.magicPower = (s.stats.magicPower || 0) + (item.magicPower * qty);
        if (item.magicPen)   s.stats.magicPen   = (s.stats.magicPen   || 0) + (item.magicPen   * qty);
        if (item.defense)    s.stats.defense    = (s.stats.defense    || 0) + (item.defense    * qty);
        if (item.luck)       s.stats.luck       = (s.stats.luck       || 0) + (item.luck       * qty);
      }
      const qr = updateQuestProgress(s, "shop");
      const nt = checkAndGrantTitles(s);
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Buy", "✅",
        `Purchased: ${item.name} ×${qty}\nSilver: ${s.silver.toLocaleString()} 🪙 | Gold: ${s.gold} 💰${questRewardLine(qr)}${titleLine(nt)}`
      ), threadID, messageID);
      return;
    }

    if (action === "sell") {
      const itemID = args[1]?.toUpperCase();
      const qty    = parseInt(args[2]) || 1;
      if (!itemID || qty <= 0) { await api.sendMessage(styled("Sell", "⚠️", "Usage: wws sell <itemID> <qty>"), threadID, messageID); return; }
      const isWand = (WANDS as any)[itemID];
      const isPot  = (POTIONS as any)[itemID];
      const isAcc  = (ACCESSORIES as any)[itemID];
      const item   = isWand || isPot || isAcc;
      if (!item) { await api.sendMessage(styled("Sell", "❌", `Item "${itemID}" not found.`), threadID, messageID); return; }
      if (isWand && !s.inventory.wands[itemID]) { await api.sendMessage(styled("Sell", "❌", `You don't own [${itemID}].`), threadID, messageID); return; }
      if (isPot  && (s.inventory.potions[itemID] || 0) < qty) { await api.sendMessage(styled("Sell", "❌", `You only have ${s.inventory.potions[itemID] || 0}× [${itemID}].`), threadID, messageID); return; }
      if (isAcc  && (s.inventory.accessories[itemID] || 0) < qty) { await api.sendMessage(styled("Sell", "❌", `You only have ${s.inventory.accessories[itemID] || 0}× [${itemID}].`), threadID, messageID); return; }
      const gain = Math.floor(item.cost.silver * qty * 0.5);
      s.silver = (s.silver || 0) + gain;
      if (isWand) { delete s.inventory.wands[itemID]; if (s.equippedWand === itemID) s.equippedWand = undefined; }
      if (isPot)  s.inventory.potions[itemID]     = Math.max(0, (s.inventory.potions[itemID] || 0) - qty);
      if (isAcc)  s.inventory.accessories[itemID] = Math.max(0, (s.inventory.accessories[itemID] || 0) - qty);
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Sell", "✅", `Sold: ${item.name} ×${qty}\n+${gain.toLocaleString()} 🪙 (50% value)\nSilver: ${s.silver.toLocaleString()} 🪙`), threadID, messageID);
      return;
    }

    if (action === "use") {
      const potID = args[1]?.toUpperCase();
      const qty   = parseInt(args[2]) || 1;
      if (!potID || !(POTIONS as any)[potID]) { await api.sendMessage(styled("Use", "⚠️", "Usage: wws use <potionID> <qty>"), threadID, messageID); return; }
      const owned = s.inventory.potions[potID] || 0;
      if (!isDev && owned < qty) { await api.sendMessage(styled("Use", "❌", `Only ${owned}× ${(POTIONS as any)[potID].name} owned.`), threadID, messageID); return; }
      const p = (POTIONS as any)[potID];
      if (!isDev) s.inventory.potions[potID] = Math.max(0, owned - qty);
      const ef = p.effect;
      if (ef.magicPower) s.stats.magicPower = (s.stats.magicPower || 0) + ef.magicPower * qty;
      if (ef.magicPen)   s.stats.magicPen   = (s.stats.magicPen   || 0) + ef.magicPen   * qty;
      if (ef.defense)    s.stats.defense    = (s.stats.defense    || 0) + ef.defense    * qty;
      if (ef.luck)       s.stats.luck       = (s.stats.luck       || 0) + ef.luck       * qty;
      if (ef.spellAmp)   s.spellAmpCharges  = (s.spellAmpCharges  || 0) + ef.spellAmp  * qty;
      if (ef.dungeonCooldownReduce && !isDev) s.dungeonCooldown = Math.max(0, s.dungeonCooldown - ef.dungeonCooldownReduce * qty);
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Use Item", "✅",
        `Used ${qty}× ${p.name}\n${p.desc}\n\nMagic Power: ${s.stats.magicPower.toLocaleString()}\nMagic Pen: ${s.stats.magicPen.toLocaleString()}\nDefense: ${s.stats.defense.toLocaleString()} | Luck: ${s.stats.luck.toLocaleString()}${ef.spellAmp ? `\n⚡ Spell Amp Charges: ${s.spellAmpCharges}` : ""}`
      ), threadID, messageID);
      return;
    }

    if (action === "inventory") {
      const wands = Object.entries(s.inventory.wands).map(([id, w]) =>
        `  ${s.equippedWand === id ? "🟢" : "⬜"} [${id}] ${w.name} Lv.${s.wandUpgrades[id] || 0}/${MAX_WAND_UPGRADE}`
      ).join("\n") || "  None";
      const potions = Object.entries(s.inventory.potions).filter(([, q]) => q > 0).map(([id, q]) =>
        `  [${id}] ${(POTIONS as any)[id]?.name || id} ×${q}`
      ).join("\n") || "  None";
      const accs = Object.entries(s.inventory.accessories).filter(([, q]) => q > 0).map(([id, q]) =>
        `  [${id}] ${(ACCESSORIES as any)[id]?.name || id} ×${q}`
      ).join("\n") || "  None";
      await api.sendMessage(styled("Inventory", "🎒",
        `🪙 Silver: ${s.silver.toLocaleString()}\n💰 Gold: ${s.gold}\n\n🪄 WANDS:\n${wands}\n\n🧪 POTIONS:\n${potions}\n\n💍 ACCESSORIES:\n${accs}\n\n⚡ Spell Amp Charges: ${s.spellAmpCharges || 0}`
      ), threadID, messageID);
      return;
    }

    if (action === "dungeon") {
      const dSub = args[1]?.toLowerCase();

      if (!dSub || dSub === "status") {
        const floor    = s.dungeonFloor;
        const nextFloor = floor < 100 ? floor + 1 : null;
        const floorData = nextFloor ? (DUNGEONS as any[])[nextFloor - 1] : null;
        const cdRem     = !isDev && s.dungeonCooldown > currentTime ? s.dungeonCooldown - currentTime : 0;
        await api.sendMessage(styled("Dungeon Status", "🏰",
          `🗝️ Highest Floor Cleared: ${floor}\n${nextFloor
            ? `Next Floor: ${nextFloor} — "${floorData.name}"\nDifficulty: ${floorData.difficulty}\nBoss: ${floorData.enemyName}\nEnemy Power: ${floorData.enemyPower.toLocaleString()}`
            : "🎉 All 100 Floors Cleared!"
          }\n\nTotal Dungeon Clears: ${s.totalDungeonClears}\n${cdRem > 0 ? `⏳ Dungeon Cooldown: ${Math.ceil(cdRem / 60)} min` : "✅ Ready to enter!"}\n\nwws dungeon enter — solo attempt\nwws dungeon party — open party lobby`
        ), threadID, messageID);
        return;
      }

      if (dSub === "enter") {
        const cd = isDev ? 0 : DUNGEON_COOLDOWN;
        if (!isDev && s.dungeonCooldown > currentTime) {
          const rem = s.dungeonCooldown - currentTime;
          await api.sendMessage(styled("Dungeon", "⏳", `Dungeon cooldown: ${Math.ceil(rem / 60)} min remaining.`), threadID, messageID); return;
        }
        const nextFloor = (s.dungeonFloor || 0) + 1;
        if (nextFloor > 100) { await api.sendMessage(styled("Dungeon", "🏆", "You have already cleared all 100 floors! You are a true Magia Vander."), threadID, messageID); return; }
        const fd       = (DUNGEONS as any[])[nextFloor - 1];
        const myPow    = isDev ? 99999999 : calcPower(s) * (0.9 + Math.random() * 0.2);
        const enemyPow = fd.enemyPower * (0.9 + Math.random() * 0.2);
        const win      = isDev || myPow > enemyPow;
        if (win) {
          s.dungeonFloor = nextFloor;
          s.totalDungeonClears = (s.totalDungeonClears || 0) + 1;
          s.exp    = (s.exp    || 0) + fd.expReward;
          s.silver = (s.silver || 0) + fd.silverReward;
          s.level  = calcLevel(s.exp);
          const goldDrop = isDev ? 5 : (Math.random() < GOLD_DROP_CHANCE ? (Math.floor(Math.random() * C.GOLD_DROP_AMOUNT_MAX) + C.GOLD_DROP_AMOUNT_MIN) : 0);
          if (goldDrop > 0) s.gold = (s.gold || 0) + goldDrop;
          s.stats.magicPower = (s.stats.magicPower || 0) + 30 + nextFloor * 2;
          s.stats.magicPen   = (s.stats.magicPen   || 0) + 10 + nextFloor;
          const loot = fd.lootTable[Math.floor(Math.random() * fd.lootTable.length)];
          let lootMsg = "";
          if (loot) {
            if ((POTIONS as any)[loot])     { s.inventory.potions[loot]     = (s.inventory.potions[loot]     || 0) + 1; lootMsg = `\n🎁 Loot Drop: ${(POTIONS as any)[loot].name}`; }
            if ((ACCESSORIES as any)[loot]) { s.inventory.accessories[loot] = (s.inventory.accessories[loot] || 0) + 1; lootMsg = `\n🎁 Loot Drop: ${(ACCESSORIES as any)[loot].name}`; }
          }
          s.dungeonCooldown = currentTime + cd;
          const qr = updateQuestProgress(s, "dungeon");
          const nt = checkAndGrantTitles(s);
          await saveWWSData(db, senderID.toString(), s);
          await api.sendMessage(styled(`Floor ${nextFloor} — ${fd.name}`, "🏰",
            `Difficulty: ${fd.difficulty}\n\n${s.name} vs ${fd.enemyName}\nYour Power: ${isDev ? "99M+" : myPow.toFixed(0)} | Enemy: ${enemyPow.toFixed(0)}\n\n✅ FLOOR CLEARED!\n\n+${fd.expReward.toLocaleString()} EXP\n+${fd.silverReward.toLocaleString()} 🪙${goldDrop > 0 ? `\n+${goldDrop} 💰 GOLD COIN DROP!` : ""}\n+${30 + nextFloor * 2} Magic Power | +${10 + nextFloor} Magic Pen${lootMsg}${questRewardLine(qr)}${titleLine(nt)}`
          ), threadID, messageID);
        } else {
          s.dungeonCooldown = currentTime + cd;
          await saveWWSData(db, senderID.toString(), s);
          await api.sendMessage(styled(`Floor ${nextFloor} — ${fd.name}`, "💥",
            `Difficulty: ${fd.difficulty}\n\n${s.name} vs ${fd.enemyName}\nYour Power: ${myPow.toFixed(0)} | Enemy: ${enemyPow.toFixed(0)}\n\n💥 DEFEATED!\n\nTrain harder and try again.\nTip: Use wws train, wws bond, or buy potions from wws shop.`
          ), threadID, messageID);
        }
        return;
      }

      if (dSub === "party") {
        const pSub = args[2]?.toLowerCase();
        const existingParty = activeParties.get(threadID);

        if (pSub === "stop") {
          if (!existingParty) { await api.sendMessage(styled("Dungeon Party", "⚠️", "No active party in this chat."), threadID, messageID); return; }
          if (existingParty.hostID !== senderID.toString() && !isDev) { await api.sendMessage(styled("Dungeon Party", "❌", "Only the party host can stop the party."), threadID, messageID); return; }
          activeParties.delete(threadID);
          await api.sendMessage(styled("Dungeon Party", "🛑",
            `Party disbanded by the host.\n\nAll members keep their current dungeon floor progress.\nYou can continue solo or form a new party anytime.`
          ), threadID, messageID);
          return;
        }

        if (pSub === "begin") {
          if (!existingParty) { await api.sendMessage(styled("Dungeon Party", "⚠️", "No active party. Use wws dungeon party first."), threadID, messageID); return; }
          if (existingParty.hostID !== senderID.toString() && !isDev) { await api.sendMessage(styled("Dungeon Party", "❌", "Only the host can begin."), threadID, messageID); return; }
          if (existingParty.members.length < 2) { await api.sendMessage(styled("Dungeon Party", "⚠️", `Need at least 2 members. Current: ${existingParty.members.length}/${PARTY_MAX}.`), threadID, messageID); return; }
          const col       = db.db("wws_players");
          const lowestFloor = await (async () => {
            let min = 100;
            for (const pid of existingParty.members) {
              const pd = await col.findOne({ userID: pid });
              if (pd) min = Math.min(min, (pd as WWSData).dungeonFloor || 0);
            }
            return min;
          })();
          const nextFloor = lowestFloor + 1;
          if (nextFloor > 100) { await api.sendMessage(styled("Dungeon Party", "🏆", "All members have cleared all 100 floors!"), threadID, messageID); return; }
          const fd       = (DUNGEONS as any[])[nextFloor - 1];
          let partyPow   = 0;
          const names: string[] = [];
          for (const pid of existingParty.members) {
            const pd = await col.findOne({ userID: pid });
            if (pd) { partyPow += isDevUser(pid) ? 99999999 : calcPower(pd as WWSData); names.push((pd as WWSData).name || "Mage"); }
          }
          const enemyPow = fd.enemyPower * (0.9 + Math.random() * 0.2);
          const win      = partyPow * (0.9 + Math.random() * 0.2) > enemyPow;
          const rewards: string[] = [];
          for (const pid of existingParty.members) {
            const pd = await col.findOne({ userID: pid });
            if (!pd) continue;
            const member = pd as WWSData;
            if (win) {
              member.dungeonFloor = Math.max(member.dungeonFloor || 0, nextFloor);
              member.totalDungeonClears = (member.totalDungeonClears || 0) + 1;
              member.exp    = (member.exp    || 0) + Math.floor(fd.expReward * 0.8);
              member.silver = (member.silver || 0) + Math.floor(fd.silverReward * 0.8);
              member.level  = calcLevel(member.exp);
              const gd = isDevUser(pid) ? 3 : (Math.random() < GOLD_DROP_CHANCE ? 1 : 0);
              if (gd > 0) member.gold = (member.gold || 0) + gd;
              member.stats.magicPower = (member.stats.magicPower || 0) + 20 + nextFloor;
              const qr2 = updateQuestProgress(member, "dungeon");
              const qr3 = updateQuestProgress(member, "party");
              const nt2 = checkAndGrantTitles(member);
              await saveWWSData(db, pid, member);
              if (pid === senderID.toString()) { rewards.push(questRewardLine(qr2)); rewards.push(questRewardLine(qr3)); rewards.push(titleLine(nt2)); }
            } else {
              member.exp    = (member.exp    || 0) + Math.floor(fd.expReward * 0.1);
              member.silver = (member.silver || 0) + Math.floor(fd.silverReward * 0.1);
              await saveWWSData(db, pid, member);
            }
          }
          activeParties.delete(threadID);
          await api.sendMessage(styled(`Party — Floor ${nextFloor}`, win ? "🏆" : "💥",
            `Party: ${names.join(", ")}\nFloor: ${nextFloor} — ${fd.name} [${fd.difficulty}]\nBoss: ${fd.enemyName}\n\nParty Power: ${partyPow.toFixed(0)} | Enemy: ${enemyPow.toFixed(0)}\n\n${win
              ? `✅ FLOOR CLEARED!\n\nEach member:\n+${Math.floor(fd.expReward * 0.8).toLocaleString()} EXP\n+${Math.floor(fd.silverReward * 0.8).toLocaleString()} 🪙\n+20 Magic Power${rewards.join("")}`
              : `💥 DEFEATED!\nEach member gets consolation EXP.\nTrain more and try again.`
            }`
          ), threadID, messageID);
          return;
        }

        if (existingParty && existingParty.expiresAt > currentTime) {
          await api.sendMessage(styled("Dungeon Party", "ℹ️",
            `Party already open! (${existingParty.members.length}/${PARTY_MAX})\nReply "Dungeon Accept" to the original lobby message.\nHost: wws dungeon party begin`
          ), threadID, messageID);
          return;
        }

        activeParties.set(threadID, {
          hostID: senderID.toString(), members: [senderID.toString()],
          expiresAt: currentTime + PARTY_DURATION, currentFloor: s.dungeonFloor, active: false,
        });
        const partyMsgInfo: any = await new Promise(resolve => {
          api.sendMessage(styled("⚔️ DUNGEON PARTY", "🏰",
            `${s.name} opened a Dungeon Party!\n\nUp to ${PARTY_MAX} mages can join.\nReply "Dungeon Accept" to THIS message within 5 minutes.\n\nHost: wws dungeon party begin — start\nHost: wws dungeon party stop — disband\n\nFloor: Party will start from the lowest member's next floor.`
          ), threadID, (err: any, info: any) => resolve(info), messageID);
        });
        const partyMsgID = partyMsgInfo?.messageID;
        if (!partyMsgID) return;
        global.registerEnkiduListener(partyMsgID, async ({ api, event: ev }: any) => {
          if (ev.body?.toLowerCase().trim() !== "dungeon accept") return;
          const party = activeParties.get(threadID);
          if (!party || Math.floor(Date.now() / 1000) > party.expiresAt) {
            await api.sendMessage(styled("Dungeon Party", "⚠️", "The party lobby has expired."), ev.threadID, ev.messageID);
            global.replyListeners.delete(partyMsgID); return;
          }
          if (party.members.includes(ev.senderID.toString())) { await api.sendMessage(styled("Dungeon Party", "⚠️", "Already in the party!"), ev.threadID, ev.messageID); return; }
          if (party.members.length >= PARTY_MAX) {
            await api.sendMessage(styled("Dungeon Party", "🛑", `Party is full (${PARTY_MAX}/${PARTY_MAX}).`), ev.threadID, ev.messageID);
            global.replyListeners.delete(partyMsgID); return;
          }
          const joiner = await db.db("wws_players").findOne({ userID: ev.senderID.toString() });
          if (!joiner?.name) { await api.sendMessage(styled("Dungeon Party", "⚠️", "Register first: wws register <name>"), ev.threadID, ev.messageID); return; }
          party.members.push(ev.senderID.toString());
          activeParties.set(threadID, party);
          const rem  = party.expiresAt - Math.floor(Date.now() / 1000);
          const mins = Math.floor(rem / 60); const secs = rem % 60;
          await api.sendMessage(styled("Dungeon Party", "✅",
            `${(joiner as WWSData).name} joined! (${party.members.length}/${PARTY_MAX})\n\nTime left: ${mins}m ${secs}s\nReply "Dungeon Accept" to join.`
          ), ev.threadID, ev.messageID);
        });
        setTimeout(() => {
          activeParties.delete(threadID);
          if (global.replyListeners) global.replyListeners.delete(partyMsgID);
        }, PARTY_DURATION * 1000);
        return;
      }

      if (dSub === "raid") {
        const existingRaid = activeRaids.get(threadID);
        const rSub = args[2]?.toLowerCase();

        if (rSub === "begin") {
          if (!existingRaid) { await api.sendMessage(styled("Dungeon Raid", "⚠️", "No active raid. Use wws dungeon raid first."), threadID, messageID); return; }
          if (existingRaid.hostID !== senderID.toString() && !isDev) { await api.sendMessage(styled("Dungeon Raid", "❌", "Only the raid host can begin."), threadID, messageID); return; }
          if (existingRaid.members.length < 2) { await api.sendMessage(styled("Dungeon Raid", "⚠️", `Need at least 2 members. Current: ${existingRaid.members.length}/${C.RAID_MAX_PARTICIPANTS}.`), threadID, messageID); return; }
          const raidBosses = [
            { name: "Dungeon Overlord",     power: 5000000  },
            { name: "Void Dragon",           power: 8000000  },
            { name: "Ancient Magic Titan",   power: 12000000 },
            { name: "Abyssal God Fragment",  power: 20000000 },
          ];
          const rb       = raidBosses[Math.floor(Math.random() * raidBosses.length)];
          const col      = db.db("wws_players");
          let partyPow   = 0;
          const names: string[] = [];
          for (const pid of existingRaid.members) {
            const pd = await col.findOne({ userID: pid });
            if (pd) { partyPow += isDevUser(pid) ? 99999999 : calcPower(pd as WWSData); names.push((pd as WWSData).name || "Mage"); }
          }
          const win = partyPow * (0.85 + Math.random() * 0.3) > rb.power;
          for (const pid of existingRaid.members) {
            const pd = await col.findOne({ userID: pid });
            if (!pd) continue;
            const member = pd as WWSData;
            member.exp    = (member.exp    || 0) + (win ? 500000 : 50000);
            member.silver = (member.silver || 0) + (win ? 200000 : 20000);
            if (win) member.gold = (member.gold || 0) + (isDevUser(pid) ? 20 : Math.floor(Math.random() * 5) + 1);
            member.level  = calcLevel(member.exp);
            await saveWWSData(db, pid, member);
          }
          activeRaids.delete(threadID);
          await api.sendMessage(styled("⚔️ DUNGEON RAID", win ? "🏆" : "💥",
            `Raid Party: ${names.join(", ")}\nBoss: ${rb.name} (Power: ${rb.power.toLocaleString()})\nParty Power: ${partyPow.toLocaleString()}\n\n${win
              ? `🏆 VICTORY!\nEach member: +500,000 EXP | +200,000 🪙 | +Gold Coins!`
              : `💥 DEFEAT!\nEach member: +50,000 EXP consolation.`
            }`
          ), threadID, messageID);
          return;
        }

        if (existingRaid) { await api.sendMessage(styled("Dungeon Raid", "ℹ️", `Raid open: ${existingRaid.members.length}/${C.RAID_MAX_PARTICIPANTS}. Reply "Join Raid" to the lobby message.`), threadID, messageID); return; }
        activeRaids.set(threadID, { hostID: senderID.toString(), members: [senderID.toString()], expiresAt: currentTime + C.RAID_DURATION_SECS });
        const raidMsgInfo: any = await new Promise(resolve => {
          api.sendMessage(styled("⚔️ DUNGEON RAID", "🏰",
            `${s.name} initiated a Dungeon Raid!\n\nUp to ${C.RAID_MAX_PARTICIPANTS} mages can join.\nReply "Join Raid" to THIS message within 5 minutes.\n\nRewards (on win): 500,000 EXP + 200,000 🪙 + Gold Coins!\n\nHost: wws dungeon raid begin — when ready.`
          ), threadID, (err: any, info: any) => resolve(info), messageID);
        });
        const raidMsgID = raidMsgInfo?.messageID;
        if (!raidMsgID) return;
        global.registerEnkiduListener(raidMsgID, async ({ api, event: ev }: any) => {
          if (ev.body?.toLowerCase().trim() !== "join raid") return;
          const raid = activeRaids.get(threadID);
          if (!raid || Math.floor(Date.now() / 1000) > raid.expiresAt) { await api.sendMessage(styled("Raid", "⚠️", "Raid expired."), ev.threadID, ev.messageID); global.replyListeners.delete(raidMsgID); return; }
          if (raid.members.includes(ev.senderID.toString())) { await api.sendMessage(styled("Raid", "⚠️", "Already joined!"), ev.threadID, ev.messageID); return; }
          if (raid.members.length >= C.RAID_MAX_PARTICIPANTS) { await api.sendMessage(styled("Raid", "🛑", "Raid is full!"), ev.threadID, ev.messageID); global.replyListeners.delete(raidMsgID); return; }
          const joiner = await db.db("wws_players").findOne({ userID: ev.senderID.toString() });
          if (!joiner?.name) { await api.sendMessage(styled("Raid", "⚠️", "Register first."), ev.threadID, ev.messageID); return; }
          raid.members.push(ev.senderID.toString());
          activeRaids.set(threadID, raid);
          const rem  = raid.expiresAt - Math.floor(Date.now() / 1000);
          await api.sendMessage(styled("Raid", "✅", `${(joiner as WWSData).name} joined! (${raid.members.length}/${C.RAID_MAX_PARTICIPANTS})\nTime left: ${Math.floor(rem / 60)}m ${rem % 60}s`), ev.threadID, ev.messageID);
        });
        setTimeout(() => { activeRaids.delete(threadID); if (global.replyListeners) global.replyListeners.delete(raidMsgID); }, C.RAID_DURATION_SECS * 1000);
        return;
      }

      if (dSub === "leaderboard") {
        const col = db.db("wws_players");
        const top = await col.find({ name: { $exists: true } }).sort({ dungeonFloor: -1, exp: -1 }).limit(10).toArray();
        const list = top.map((p: any, i: number) =>
          `${i + 1}. ${p.name} [${p.characterName || "—"}] — Floor ${p.dungeonFloor || 0} | Lv.${p.level || 1}`
        ).join("\n");
        await api.sendMessage(styled("Dungeon Leaderboard", "🏆", `TOP 10 — HIGHEST FLOOR CLEARED\n\n${list || "No mages yet."}`), threadID, messageID);
        return;
      }

      await api.sendMessage(styled("Dungeon", "⚠️", "Usage: wws dungeon status | enter | party | party begin | party stop | raid | raid begin | leaderboard"), threadID, messageID);
      return;
    }

    if (action === "daily") {
      const cd = isDev ? 0 : DAILY_COOLDOWN;
      if (!isDev && s.dailyCooldown > currentTime) {
        const rem = s.dailyCooldown - currentTime;
        const h = Math.floor(rem / 3600); const m = Math.ceil((rem % 3600) / 60);
        await api.sendMessage(styled("Daily Reward", "⏳", `Already claimed! Come back in ${h}h ${m}m.`), threadID, messageID); return;
      }
      const today     = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (s.lastLoginDate === yesterday) s.loginStreak = (s.loginStreak || 0) + 1;
      else if (s.lastLoginDate !== today)  s.loginStreak = 1;
      s.lastLoginDate  = today;
      const streak = s.loginStreak || 1;
      const mult   = Math.min(streak, 7);
      const expR   = isDev ? 999999  : 1000 * mult;
      const silR   = isDev ? 9999999 : 1500 * mult;
      const goldR  = isDev ? 999     : (streak >= 7 ? 1 : 0);
      s.exp    = (s.exp    || 0) + expR;
      s.silver = (s.silver || 0) + silR;
      s.gold   = (s.gold   || 0) + goldR;
      s.level  = calcLevel(s.exp);
      s.dailyCooldown = currentTime + cd;
      const nt = checkAndGrantTitles(s);
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Daily Reward", "🎁",
        `Daily reward claimed!\n🔥 Streak: ${streak} day(s) — ${mult}× multiplier\n\n+${expR.toLocaleString()} EXP\n+${silR.toLocaleString()} 🪙 Silver${goldR > 0 ? `\n+${goldR} 💰 Gold Coin (7-day streak bonus!)` : ""}\n\nSilver: ${s.silver.toLocaleString()} 🪙\nCome back tomorrow to keep your streak!${titleLine(nt)}`
      ), threadID, messageID);
      return;
    }

    if (action === "quest") {
      const questLines = Object.entries(QUESTS_DEF).map(([key, def]: [string, any]) => {
        const q = s.quests?.[key] || { progress: 0, completed: false };
        return `${q.completed ? "✅" : "🔲"} ${def.description} (${q.progress}/${def.goal})\n   Reward: +${def.reward.silver.toLocaleString()} 🪙${def.reward.gold > 0 ? ` +${def.reward.gold} 💰` : ""} +${def.reward.exp.toLocaleString()} EXP`;
      }).join("\n");
      await api.sendMessage(styled("Quests", "📜", `Active Quests:\n\n${questLines}\n\nCompleted quests auto-reward on completion.`), threadID, messageID);
      return;
    }

    if (action === "rank") {
      const rankData    = getRankData(s.mageRank);
      const nextRank    = s.mageRank < MAX_RANK ? getRankData(s.mageRank + 1) : null;
      const power       = isDev ? 99999999 : calcPower(s);
      await api.sendMessage(styled("Mage Rank", "🏅",
        `Current Rank: ${s.mageRank}/${MAX_RANK} — ${rankData.name}\n\nYour Power: ${power.toLocaleString()}\nYour EXP: ${s.exp.toLocaleString()}\n\n${nextRank
          ? `Next Rank: ${nextRank.name}\nRequired Power: ${nextRank.powerRequired.toLocaleString()}\nRequired EXP: ${nextRank.expRequired.toLocaleString()}\n\nUse wws rankup to attempt a rank promotion.`
          : "🌟 Maximum Rank Reached — MAGIA VANDER!"
        }`
      ), threadID, messageID);
      return;
    }

    if (action === "rankup") {
      if ((s.mageRank || 1) >= MAX_RANK) { await api.sendMessage(styled("Rank Up", "🌟", "Already at max rank — Magia Vander!"), threadID, messageID); return; }
      const next  = getRankData((s.mageRank || 1) + 1);
      const power = isDev ? 99999999 : calcPower(s);
      if (!isDev && (power < next.powerRequired || s.exp < next.expRequired)) {
        await api.sendMessage(styled("Rank Up", "❌",
          `Not ready for Rank ${next.rank} — ${next.name}!\n\nRequired Power: ${next.powerRequired.toLocaleString()} (You: ${power.toFixed(0)})\nRequired EXP: ${next.expRequired.toLocaleString()} (You: ${s.exp.toLocaleString()})\n\nKeep training, battling, and clearing the dungeon!`
        ), threadID, messageID); return;
      }
      const old    = s.mageRank;
      s.mageRank   = (s.mageRank || 1) + 1;
      const qr     = updateQuestProgress(s, "rank");
      const nt     = checkAndGrantTitles(s);
      await saveWWSData(db, senderID.toString(), s);
      await api.sendMessage(styled("Rank Up!", "🏅",
        `🎉 RANK UP!\n\n${old <= 0 ? "?" : getRankData(old).name} → ${next.name}\nRank: ${s.mageRank}/${MAX_RANK}\n\nYou grow stronger as a mage of Regarden!${questRewardLine(qr)}${titleLine(nt)}`
      ), threadID, messageID);
      return;
    }

    if (action === "achievement") {
      const unlocked = s.titles || [];
      const list     = TITLES.map((t: any) =>
        `${unlocked.includes(t.id) ? "✅" : "🔒"} ${t.label}\n   ${t.how}`
      ).join("\n");
      await api.sendMessage(styled("Achievements", "🎖️", `Unlocked: ${unlocked.length}/${TITLES.length}\n\n${list}`), threadID, messageID);
      return;
    }

    if (action === "title") {
      const tSub = args[1]?.toLowerCase();
      if (!tSub || tSub === "list") {
        const unlocked = s.titles || [];
        const list     = TITLES.map((t: any) =>
          `${unlocked.includes(t.id) ? "✅" : "🔒"} [${t.id}] ${t.label} — ${t.how}`
        ).join("\n");
        const active   = s.activeTitle ? (TITLES.find((t: any) => t.id === s.activeTitle)?.label || s.activeTitle) : "None";
        await api.sendMessage(styled("Titles", "🎖️", `Active: ${active}\n\n${list}\n\nEquip: wws title set <titleID>`), threadID, messageID); return;
      }
      if (tSub === "set") {
        const tid = args.slice(2).join("_").toLowerCase();
        if (!tid || !TITLES.find((t: any) => t.id === tid)) { await api.sendMessage(styled("Title", "⚠️", "Invalid title ID. Use wws title list to see IDs."), threadID, messageID); return; }
        if (!(s.titles || []).includes(tid) && !isDev) { await api.sendMessage(styled("Title", "🛑", "Haven't unlocked this title yet!"), threadID, messageID); return; }
        s.activeTitle = tid;
        await saveWWSData(db, senderID.toString(), s);
        const lbl = TITLES.find((t: any) => t.id === tid)?.label || tid;
        await api.sendMessage(styled("Title", "✅", `Active title set: ${lbl}`), threadID, messageID); return;
      }
      await api.sendMessage(styled("Title", "⚠️", "Usage: wws title list | wws title set <titleID>"), threadID, messageID); return;
    }

    if (action === "guild") {
      const gSub  = args[1]?.toLowerCase();
      const gName = args.slice(2).join(" ").trim();
      const col   = db.db("wws_guilds");

      if (gSub === "create") {
        if (!gName) { await api.sendMessage(styled("Guild", "⚠️", "Usage: wws guild create <name>"), threadID, messageID); return; }
        if (s.guild) { await api.sendMessage(styled("Guild", "🛑", `Already in guild: ${s.guild}. Leave first.`), threadID, messageID); return; }
        const exists = await col.findOne({ name: gName });
        if (exists) { await api.sendMessage(styled("Guild", "❌", `Guild "${gName}" already exists.`), threadID, messageID); return; }
        await col.insertOne({ name: gName, founderID: senderID.toString(), members: [senderID.toString()], totalPower: Math.floor(calcPower(s)), createdAt: currentTime } as GuildData);
        s.guild = gName;
        const nt = checkAndGrantTitles(s);
        await saveWWSData(db, senderID.toString(), s);
        await api.sendMessage(styled("Guild", "🏛️", `Guild "${gName}" created! You are the founder.${titleLine(nt)}`), threadID, messageID); return;
      }

      if (gSub === "join") {
        if (!gName) { await api.sendMessage(styled("Guild", "⚠️", "Usage: wws guild join <name>"), threadID, messageID); return; }
        if (s.guild) { await api.sendMessage(styled("Guild", "🛑", `Already in guild: ${s.guild}.`), threadID, messageID); return; }
        const g = await col.findOne({ name: gName });
        if (!g) { await api.sendMessage(styled("Guild", "❌", `Guild "${gName}" not found.`), threadID, messageID); return; }
        await col.updateOne({ name: gName }, { $push: { members: senderID.toString() } });
        s.guild = gName; await saveWWSData(db, senderID.toString(), s);
        await api.sendMessage(styled("Guild", "✅", `Joined guild: ${gName}!`), threadID, messageID); return;
      }

      if (gSub === "leave") {
        if (!s.guild) { await api.sendMessage(styled("Guild", "⚠️", "Not in any guild."), threadID, messageID); return; }
        const old = s.guild;
        await col.updateOne({ name: s.guild }, { $pull: { members: senderID.toString() } });
        s.guild = undefined; await saveWWSData(db, senderID.toString(), s);
        await api.sendMessage(styled("Guild", "✅", `Left guild: ${old}.`), threadID, messageID); return;
      }

      if (gSub === "info") {
        const gn = gName || s.guild;
        if (!gn) { await api.sendMessage(styled("Guild", "⚠️", "Not in a guild. Usage: wws guild info <name>"), threadID, messageID); return; }
        const g = await col.findOne({ name: gn });
        if (!g) { await api.sendMessage(styled("Guild", "❌", `Guild "${gn}" not found.`), threadID, messageID); return; }
        await api.sendMessage(styled("Guild Info", "🏛️", `${g.name}\nMembers: ${g.members?.length || 0}\nTotal Power: ${(g.totalPower || 0).toLocaleString()}\nFounded: ${new Date((g.createdAt || 0) * 1000).toLocaleDateString()}`), threadID, messageID); return;
      }

      if (gSub === "list") {
        const all  = await col.find({}).sort({ totalPower: -1 }).limit(10).toArray();
        const list = all.map((g: any, i: number) => `${i + 1}. ${g.name} — ${g.members?.length || 0} members | Power: ${(g.totalPower || 0).toLocaleString()}`).join("\n");
        await api.sendMessage(styled("Guild List", "🏛️", `Top Guilds:\n\n${list || "No guilds yet."}`), threadID, messageID); return;
      }

      if (gSub === "contribute") {
        if (!s.guild) { await api.sendMessage(styled("Guild", "⚠️", "Not in a guild."), threadID, messageID); return; }
        const amount = parseInt(args[2]) || 1000;
        if (s.silver < amount && !isDev) { await api.sendMessage(styled("Guild", "❌", `Not enough silver! You have ${s.silver.toLocaleString()} 🪙.`), threadID, messageID); return; }
        if (!isDev) s.silver -= amount;
        await col.updateOne({ name: s.guild }, { $inc: { totalPower: Math.floor(amount / 100) } });
        await saveWWSData(db, senderID.toString(), s);
        await api.sendMessage(styled("Guild", "✅", `Contributed ${amount.toLocaleString()} 🪙 to ${s.guild}!\nSilver remaining: ${s.silver.toLocaleString()} 🪙`), threadID, messageID); return;
      }

      await api.sendMessage(styled("Guild", "⚠️", "Usage: wws guild create | join | leave | info | list | contribute"), threadID, messageID); return;
    }

    if (action === "leaderboard") {
      const col = db.db("wws_players");
      const top = await col.find({ name: { $exists: true } }).sort({ "stats.magicPower": -1, exp: -1 }).limit(10).toArray();
      const list = top.map((p: any, i: number) =>
        `${i + 1}. ${p.name} [${p.characterName || "—"}] — Power: ${Math.floor(calcPower(p as WWSData)).toLocaleString()} | Lv.${p.level || 1}`
      ).join("\n");
      await api.sendMessage(styled("Leaderboard", "🏆", `🏆 TOP 10 MAGES BY POWER\n\n${list || "No mages yet."}`), threadID, messageID);
      return;
    }

    if (action === "lore") {
      const loreIndex = parseInt(args[1]) || 1;
      const loreEntries: Record<number, string> = {
        1: `📖 LORE 1 — The World of Regarden\n\nIn the world of Wistoria, magic is everything. Those born with magical aptitude are trained at the prestigious Regarden Magic Academy. The pinnacle achievement any mage can reach is the legendary rank of Magia Vander — a title held only by the most extraordinary practitioners in history.\n\nMagic is measured through wands and spell mastery. The type of magic you wield defines your path.`,
        2: `📖 LORE 2 — The Five Wonders\n\nFive students stand above all others at Regarden. Known as the Five Wonders, they are Lesedi Ingwe, Coco Zenon, Gracier, Ottilie Puppel, and Olin Doal. Each commands a different elemental affinity with devastating effect.\n\nTo face them in a duel is to understand the gulf between ordinary mages and the truly gifted.`,
        3: `📖 LORE 3 — Will Serfort\n\nAmong all the students, none stands out as uniquely as Will Serfort. Born without any magical aptitude — a fact that should disqualify him entirely — he enrolled using sheer persistence. His only weapon is a sword.\n\nYet something burns within Will that defies logic. He made a promise to reach Magia Vander. And no wall — magical or otherwise — will stop him.`,
        4: `📖 LORE 4 — The Dungeon\n\nBeneath the academy lies the legendary Magic Tower Dungeon. 100 floors of escalating danger, ancient monsters, and priceless loot. Floor 30, 45, 60, 80, and 100 are known as Insane Floors — territory where only the elite survive.\n\nLegend says clearing Floor 100 is a feat equivalent to achieving Magia Vander itself.`,
        5: `📖 LORE 5 — Silver and Gold\n\nCurrency in this world flows in two forms. Silver Coins are the common currency — earned from battles, dungeons, and quests. Gold Coins are rare, precious, and dropped only by the dungeon at a 5% chance per clear.\n\nThe most powerful wands and spells are priced in Gold — a deliberate barrier that separates the dedicated from the casual.`,
      };
      const total = Object.keys(loreEntries).length;
      if (!loreEntries[loreIndex]) {
        await api.sendMessage(styled("Lore", "📖", `Lore entry ${loreIndex} not found.\nAvailable: 1–${total}\nUsage: wws lore <number>`), threadID, messageID); return;
      }
      await api.sendMessage(styled("Lore", "📖", `${loreEntries[loreIndex]}\n\nwws lore <1–${total}> to read more entries.`), threadID, messageID);
      return;
    }

    if (action === "surge") {
      const surgeSub = args[1]?.toLowerCase();
      if (surgeSub === "start") {
        if (!isAuthorized(senderID.toString(), isDev)) { await api.sendMessage(styled("Magic Surge", "❌", "Only admins, developers, or VIPs can start a Magic Surge."), threadID, messageID); return; }
        const existing = activeSurges.get(threadID);
        if (existing && existing.expiresAt > currentTime) { await api.sendMessage(styled("Magic Surge", "⚠️", "A Magic Surge is already active!"), threadID, messageID); return; }
        activeSurges.set(threadID, { expiresAt: currentTime + SURGE_DURATION, claimedBy: null });
        await api.sendMessage(styled("⚡ MAGIC SURGE ⚡", "✨",
          `A surge of magical energy erupts through the leylines!\n\nThe first registered mage to use wws surge enter within 10 minutes claims:\n• 50,000 EXP\n• 30,000 🪙 Silver\n• 10 💰 Gold Coins\n\nOnly ONE mage can claim this!`
        ), threadID, messageID);
        setTimeout(() => {
          const sg = activeSurges.get(threadID);
          if (sg && !sg.claimedBy) { activeSurges.delete(threadID); api.sendMessage(styled("Magic Surge", "✨", "The surge faded before anyone could claim it."), threadID); }
        }, SURGE_DURATION * 1000);
        return;
      }
      if (surgeSub === "enter") {
        const surge = activeSurges.get(threadID);
        if (!surge || surge.expiresAt < currentTime) { await api.sendMessage(styled("Magic Surge", "⚠️", "No active Magic Surge. Watch for announcements!"), threadID, messageID); return; }
        if (surge.claimedBy) { await api.sendMessage(styled("Magic Surge", "🛑", "Already claimed by another mage!"), threadID, messageID); return; }
        surge.claimedBy = senderID.toString();
        activeSurges.set(threadID, surge);
        s.exp    = (s.exp    || 0) + 50000;
        s.silver = (s.silver || 0) + 30000;
        s.gold   = (s.gold   || 0) + 10;
        s.level  = calcLevel(s.exp);
        const nt = checkAndGrantTitles(s);
        await saveWWSData(db, senderID.toString(), s);
        await api.sendMessage(styled("⚡ SURGE CLAIMED!", "✨",
          `${s.name} seized the Magic Surge!\n\n+50,000 EXP | +30,000 🪙 | +10 💰\nLevel: ${s.level}${titleLine(nt)}`
        ), threadID, messageID);
        return;
      }
      await api.sendMessage(styled("Magic Surge", "⚠️", "Usage: wws surge enter\n(Admins: wws surge start)"), threadID, messageID); return;
    }

    if (action === "setstat") {
      if (!isAuthorized(senderID.toString(), isDev)) { await api.sendMessage(styled("Admin", "❌", "Access denied."), threadID, messageID); return; }
      const tName = args[1]; const mp = parseInt(args[2]); const pen = parseInt(args[3]); const def = parseInt(args[4]); const lk = parseInt(args[5]);
      if (!tName || isNaN(mp) || isNaN(pen) || isNaN(def) || isNaN(lk)) { await api.sendMessage(styled("Admin", "⚠️", "Usage: wws setstat <name> <magicPower> <magicPen> <defense> <luck>"), threadID, messageID); return; }
      const target = await db.db("wws_players").findOne({ name: tName });
      if (!target) { await api.sendMessage(styled("Admin", "❌", `Mage "${tName}" not found.`), threadID, messageID); return; }
      target.stats = { ...target.stats, magicPower: mp, magicPen: pen, defense: def, luck: lk };
      await saveWWSData(db, target.userID, target as WWSData);
      await api.sendMessage(styled("Admin", "✅", `Stats updated for ${tName}:\nMagic Power: ${mp} | Pen: ${pen} | Defense: ${def} | Luck: ${lk}`), threadID, messageID); return;
    }

    if (action === "givegold") {
      if (!isAuthorized(senderID.toString(), isDev)) { await api.sendMessage(styled("Admin", "❌", "Access denied."), threadID, messageID); return; }
      const tName = args[1]; const amt = parseInt(args[2]) || 1;
      const target = await db.db("wws_players").findOne({ name: tName });
      if (!target) { await api.sendMessage(styled("Admin", "❌", `Mage "${tName}" not found.`), threadID, messageID); return; }
      target.gold = (target.gold || 0) + amt;
      await saveWWSData(db, target.userID, target as WWSData);
      await api.sendMessage(styled("Admin", "✅", `Gave ${amt} Gold to ${tName}. Total: ${target.gold} 💰`), threadID, messageID); return;
    }

    if (action === "givesilver") {
      if (!isAuthorized(senderID.toString(), isDev)) { await api.sendMessage(styled("Admin", "❌", "Access denied."), threadID, messageID); return; }
      const tName = args[1]; const amt = parseInt(args[2]) || 1;
      const target = await db.db("wws_players").findOne({ name: tName });
      if (!target) { await api.sendMessage(styled("Admin", "❌", `Mage "${tName}" not found.`), threadID, messageID); return; }
      target.silver = (target.silver || 0) + amt;
      await saveWWSData(db, target.userID, target as WWSData);
      await api.sendMessage(styled("Admin", "✅", `Gave ${amt.toLocaleString()} Silver to ${tName}. Total: ${target.silver.toLocaleString()} 🪙`), threadID, messageID); return;
    }

    if (action === "ban") {
      if (!isAuthorized(senderID.toString(), isDev)) { await api.sendMessage(styled("Admin", "❌", "Access denied."), threadID, messageID); return; }
      const tName = args.slice(1).join(" ").trim();
      const target = await db.db("wws_players").findOne({ name: tName });
      if (!target) { await api.sendMessage(styled("Admin", "❌", `Mage "${tName}" not found.`), threadID, messageID); return; }
      target.disabled = true; await saveWWSData(db, target.userID, target as WWSData);
      await api.sendMessage(styled("Admin", "✅", `${tName} has been banned from WWS.`), threadID, messageID); return;
    }

    if (action === "unban") {
      if (!isAuthorized(senderID.toString(), isDev)) { await api.sendMessage(styled("Admin", "❌", "Access denied."), threadID, messageID); return; }
      const tName = args.slice(1).join(" ").trim();
      const target = await db.db("wws_players").findOne({ name: tName });
      if (!target) { await api.sendMessage(styled("Admin", "❌", `Mage "${tName}" not found.`), threadID, messageID); return; }
      target.disabled = false; await saveWWSData(db, target.userID, target as WWSData);
      await api.sendMessage(styled("Admin", "✅", `${tName} has been unbanned.`), threadID, messageID); return;
    }

    await api.sendMessage(styled("Wistoria: Wand and Sword", "🪄",
      `Try wws menu — view all subcommands.\nTry wws help — view all help guidelines.`
    ), threadID, messageID);
  },
};

export default wwsCommand;
