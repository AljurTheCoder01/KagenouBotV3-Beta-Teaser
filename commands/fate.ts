import AuroraBetaStyler from "@aurora/styler";
const { createReply, remove: removeReply } = require("./supportFunc/EnkiduReplyFunc");

const DEV_UID = "100000245386302";

interface ServantData {
  userID: string;
  name?: string;
  servantClass?: string;
  servantCard?: string;
  rarity?: string;
  level: number;
  exp: number;
  bondLevel: number;
  stats: { atk: number; def: number; mana: number; luck: number };
  holyGrails: number;
  gems: number;
  goldCoins: number;
  inventory: {
    weapons: { [itemId: string]: { name: string; level: number; qty: number } };
    potions: { [itemId: string]: number };
    materials: { [key: string]: number };
  };
  npCharge: number;
  npName?: string;
  skills: string[];
  quests: { [key: string]: { goal: number; progress: number; reward: number; completed: boolean; description: string } };
  dailyCooldown: number;
  lastLoginDate: string;
  loginStreak: number;
  battleCooldown: number;
  questCooldown: number;
  singularityProgress: number;
  grailWarWins: number;
  totalBattleWins: number;
  chaldea?: string;
  titles: string[];
  activeTitle?: string;
  weaponUpgrades: { [itemId: string]: number };
  disabled?: boolean;
}

interface ChaldeaData {
  name: string;
  members: string[];
  totalPower: number;
  hasChangedName?: boolean;
}

const RARITY_ORDER = ["R", "SR", "SSR", "SSSR", "XXSR"];
const ENKIDU_GEMS_COST  = 1000000000000;
const ENKIDU_COINS_COST = 1000000000;

const HERO_IDS: { [id: string]: string } = {
  "H001": "King Gilgamesh", "H002": "Enkidu", "H003": "Merlin", "H004": "Scáthach",
  "H005": "Skadi", "H006": "Artoria Pendragon", "H007": "Ozymandias", "H008": "Lancelot",
  "H009": "Tamamo-no-Mae", "H010": "Mordred", "H011": "Okita Souji", "H012": "EMIYA (Archer)",
  "H013": "Jeanne d'Arc", "H014": "Ishtar", "H015": "Ereshkigal", "H016": "Miyamoto Musashi",
  "H017": "Nikola Tesla", "H018": "Cu Chulainn", "H019": "Vlad III", "H020": "Francis Drake",
  "H021": "Nero Claudius", "H022": "Xuanzang Sanzang", "H023": "Jack the Ripper",
  "H024": "Tristan", "H025": "Penthesilea", "H026": "Chiron", "H027": "Atalante",
  "H028": "Hans Christian Andersen", "H029": "Robin Hood", "H030": "Medusa",
  "H031": "Asterios", "H032": "Arash", "H033": "Leonidas", "H034": "Ushiwakamaru",
  "H035": "Euryale", "H036": "Boudica", "H037": "Altera",
};

const HERO_COSTS: { [name: string]: { gems: number; coins: number } } = {
  "King Gilgamesh":          { gems: 0,             coins: 0          },
  "Enkidu":                  { gems: 1000000000000, coins: 1000000000 },
  "Merlin":                  { gems: 50000,          coins: 500000     },
  "Scáthach":                { gems: 50000,          coins: 500000     },
  "Skadi":                   { gems: 50000,          coins: 500000     },
  "Artoria Pendragon":       { gems: 50000,          coins: 500000     },
  "Ozymandias":              { gems: 50000,          coins: 500000     },
  "Lancelot":                { gems: 10000,          coins: 100000     },
  "Tamamo-no-Mae":           { gems: 10000,          coins: 100000     },
  "Mordred":                 { gems: 10000,          coins: 100000     },
  "Okita Souji":             { gems: 10000,          coins: 100000     },
  "EMIYA (Archer)":          { gems: 10000,          coins: 100000     },
  "Jeanne d'Arc":            { gems: 10000,          coins: 100000     },
  "Ishtar":                  { gems: 10000,          coins: 100000     },
  "Ereshkigal":              { gems: 10000,          coins: 100000     },
  "Miyamoto Musashi":        { gems: 10000,          coins: 100000     },
  "Nikola Tesla":            { gems: 10000,          coins: 100000     },
  "Cu Chulainn":             { gems: 3000,           coins: 30000      },
  "Vlad III":                { gems: 3000,           coins: 30000      },
  "Francis Drake":           { gems: 3000,           coins: 30000      },
  "Nero Claudius":           { gems: 3000,           coins: 30000      },
  "Xuanzang Sanzang":        { gems: 3000,           coins: 30000      },
  "Jack the Ripper":         { gems: 3000,           coins: 30000      },
  "Tristan":                 { gems: 3000,           coins: 30000      },
  "Penthesilea":             { gems: 3000,           coins: 30000      },
  "Chiron":                  { gems: 3000,           coins: 30000      },
  "Atalante":                { gems: 3000,           coins: 30000      },
  "Hans Christian Andersen": { gems: 500,            coins: 5000       },
  "Robin Hood":              { gems: 500,            coins: 5000       },
  "Medusa":                  { gems: 500,            coins: 5000       },
  "Asterios":                { gems: 500,            coins: 5000       },
  "Arash":                   { gems: 500,            coins: 5000       },
  "Leonidas":                { gems: 500,            coins: 5000       },
  "Ushiwakamaru":            { gems: 500,            coins: 5000       },
  "Euryale":                 { gems: 500,            coins: 5000       },
  "Boudica":                 { gems: 500,            coins: 5000       },
  "Altera":                  { gems: 500,            coins: 5000       },
};

const SHOP_IDS: { [id: string]: { type: "weapon" | "potion" | "upgrade"; ref: string } } = {
  "S101": { type: "weapon",  ref: "W001" }, "S102": { type: "weapon",  ref: "W002" },
  "S103": { type: "weapon",  ref: "W003" }, "S104": { type: "weapon",  ref: "W004" },
  "S105": { type: "weapon",  ref: "W005" }, "S106": { type: "weapon",  ref: "W006" },
  "S107": { type: "weapon",  ref: "W007" }, "S108": { type: "weapon",  ref: "W008" },
  "S109": { type: "weapon",  ref: "W009" }, "S110": { type: "weapon",  ref: "W010" },
  "S111": { type: "weapon",  ref: "W011" }, "S112": { type: "weapon",  ref: "W012" },
  "S113": { type: "weapon",  ref: "W013" }, "S114": { type: "weapon",  ref: "W014" },
  "S115": { type: "weapon",  ref: "W015" }, "S116": { type: "weapon",  ref: "W016" },
  "S117": { type: "weapon",  ref: "W017" }, "S118": { type: "weapon",  ref: "W018" },
  "S119": { type: "weapon",  ref: "W019" }, "S120": { type: "weapon",  ref: "W020" },
  "S201": { type: "potion",  ref: "P001" }, "S202": { type: "potion",  ref: "P002" },
  "S203": { type: "potion",  ref: "P003" }, "S204": { type: "potion",  ref: "P004" },
  "S205": { type: "potion",  ref: "P005" }, "S206": { type: "potion",  ref: "P006" },
  "S207": { type: "potion",  ref: "P007" }, "S208": { type: "potion",  ref: "P008" },
  "S209": { type: "potion",  ref: "P009" }, "S210": { type: "potion",  ref: "P010" },
  "S301": { type: "upgrade", ref: "W001" }, "S302": { type: "upgrade", ref: "W002" },
  "S303": { type: "upgrade", ref: "W003" }, "S304": { type: "upgrade", ref: "W004" },
  "S305": { type: "upgrade", ref: "W005" }, "S306": { type: "upgrade", ref: "W006" },
  "S307": { type: "upgrade", ref: "W007" }, "S308": { type: "upgrade", ref: "W008" },
  "S309": { type: "upgrade", ref: "W009" }, "S310": { type: "upgrade", ref: "W010" },
  "S311": { type: "upgrade", ref: "W011" }, "S312": { type: "upgrade", ref: "W012" },
  "S313": { type: "upgrade", ref: "W013" }, "S314": { type: "upgrade", ref: "W014" },
  "S315": { type: "upgrade", ref: "W015" }, "S316": { type: "upgrade", ref: "W016" },
  "S317": { type: "upgrade", ref: "W017" }, "S318": { type: "upgrade", ref: "W018" },
  "S319": { type: "upgrade", ref: "W019" }, "S320": { type: "upgrade", ref: "W020" },
};

const SERVANT_POOL: {
  name: string; rarity: string; servantClass: string; np: string;
  baseAtk: number; baseDef: number; baseMana: number; baseLuck: number;
}[] = [
  { name: "King Gilgamesh",          rarity: "XXSR", servantClass: "Archer",    np: "Enuma Elish",              baseAtk: 99000000000, baseDef: 99000000000, baseMana: 99000000000, baseLuck: 99000000000 },
  { name: "Enkidu",                  rarity: "XXSR", servantClass: "Lancer",    np: "Enuma Elish (Chains)",     baseAtk: 95000000000, baseDef: 95000000000, baseMana: 95000000000, baseLuck: 95000000000 },
  { name: "Merlin",                  rarity: "SSSR", servantClass: "Caster",    np: "Garden of Avalon",         baseAtk: 9800,  baseDef: 7200,  baseMana: 12000, baseLuck: 9500  },
  { name: "Scáthach",               rarity: "SSSR", servantClass: "Lancer",    np: "Gáe Dearg",                baseAtk: 11500, baseDef: 8000,  baseMana: 7000,  baseLuck: 8500  },
  { name: "Skadi",                   rarity: "SSSR", servantClass: "Caster",    np: "Skadi's Domain",           baseAtk: 9000,  baseDef: 7800,  baseMana: 11500, baseLuck: 9200  },
  { name: "Artoria Pendragon",       rarity: "SSSR", servantClass: "Saber",     np: "Excalibur",                baseAtk: 11800, baseDef: 9500,  baseMana: 8500,  baseLuck: 9000  },
  { name: "Ozymandias",             rarity: "SSSR", servantClass: "Rider",     np: "Ramesseum Tentyris",       baseAtk: 10500, baseDef: 8800,  baseMana: 9000,  baseLuck: 9400  },
  { name: "Lancelot",               rarity: "SSR",  servantClass: "Berserker", np: "Knight of Owner",          baseAtk: 10200, baseDef: 6500,  baseMana: 5500,  baseLuck: 6000  },
  { name: "Tamamo-no-Mae",          rarity: "SSR",  servantClass: "Caster",    np: "Eightfold Blessing",       baseAtk: 8200,  baseDef: 7500,  baseMana: 10500, baseLuck: 8800  },
  { name: "Mordred",                rarity: "SSR",  servantClass: "Saber",     np: "Claíomh Solais",           baseAtk: 10800, baseDef: 8200,  baseMana: 7200,  baseLuck: 7800  },
  { name: "Okita Souji",            rarity: "SSR",  servantClass: "Saber",     np: "Mumyou Sandanzuki",        baseAtk: 11200, baseDef: 7800,  baseMana: 7000,  baseLuck: 8000  },
  { name: "EMIYA (Archer)",         rarity: "SSR",  servantClass: "Archer",    np: "Unlimited Blade Works",    baseAtk: 9800,  baseDef: 7200,  baseMana: 8000,  baseLuck: 7500  },
  { name: "Jeanne d'Arc",           rarity: "SSR",  servantClass: "Ruler",     np: "La Pucelle",               baseAtk: 8500,  baseDef: 11000, baseMana: 9000,  baseLuck: 9500  },
  { name: "Ishtar",                 rarity: "SSR",  servantClass: "Archer",    np: "An Gal Tā Kigal Shē",     baseAtk: 10500, baseDef: 7000,  baseMana: 9500,  baseLuck: 8200  },
  { name: "Ereshkigal",             rarity: "SSR",  servantClass: "Lancer",    np: "Kur Kigal Irkalla",        baseAtk: 10000, baseDef: 9000,  baseMana: 8500,  baseLuck: 8000  },
  { name: "Miyamoto Musashi",       rarity: "SSR",  servantClass: "Saber",     np: "Ougi: Tsubame Gaeshi",     baseAtk: 11500, baseDef: 8000,  baseMana: 7500,  baseLuck: 7800  },
  { name: "Nikola Tesla",           rarity: "SSR",  servantClass: "Archer",    np: "System Keraunos",          baseAtk: 9500,  baseDef: 7500,  baseMana: 10000, baseLuck: 7000  },
  { name: "Cu Chulainn",            rarity: "SR",   servantClass: "Lancer",    np: "Gáe Bolg",                 baseAtk: 8500,  baseDef: 7000,  baseMana: 6500,  baseLuck: 7200  },
  { name: "Vlad III",               rarity: "SR",   servantClass: "Berserker", np: "Kazikli Bey",              baseAtk: 9200,  baseDef: 6000,  baseMana: 5500,  baseLuck: 5500  },
  { name: "Francis Drake",          rarity: "SR",   servantClass: "Rider",     np: "Golden Wild Hunt",         baseAtk: 8800,  baseDef: 6800,  baseMana: 6000,  baseLuck: 7800  },
  { name: "Nero Claudius",          rarity: "SR",   servantClass: "Saber",     np: "Laus Saint Claudius",      baseAtk: 8200,  baseDef: 7500,  baseMana: 7000,  baseLuck: 8000  },
  { name: "Xuanzang Sanzang",       rarity: "SR",   servantClass: "Caster",    np: "Sanzo's Sutra",            baseAtk: 7500,  baseDef: 6500,  baseMana: 9500,  baseLuck: 8500  },
  { name: "Jack the Ripper",        rarity: "SR",   servantClass: "Assassin",  np: "Maria the Ripper",         baseAtk: 9000,  baseDef: 5500,  baseMana: 6000,  baseLuck: 7000  },
  { name: "Tristan",                rarity: "SR",   servantClass: "Archer",    np: "Failnaught",               baseAtk: 8200,  baseDef: 7000,  baseMana: 7500,  baseLuck: 7500  },
  { name: "Penthesilea",            rarity: "SR",   servantClass: "Berserker", np: "Outrage Amazon",           baseAtk: 9500,  baseDef: 5800,  baseMana: 5000,  baseLuck: 6000  },
  { name: "Chiron",                 rarity: "SR",   servantClass: "Archer",    np: "Antares Snipe",            baseAtk: 8000,  baseDef: 7200,  baseMana: 7800,  baseLuck: 8200  },
  { name: "Atalante",               rarity: "SR",   servantClass: "Archer",    np: "Phoebus Catastrophe",      baseAtk: 8800,  baseDef: 6500,  baseMana: 6800,  baseLuck: 7200  },
  { name: "Hans Christian Andersen",rarity: "R",    servantClass: "Caster",    np: "Märchen Meines Lebens",    baseAtk: 5500,  baseDef: 5200,  baseMana: 7200,  baseLuck: 6500  },
  { name: "Robin Hood",             rarity: "R",    servantClass: "Archer",    np: "Yew Bow",                  baseAtk: 6500,  baseDef: 5000,  baseMana: 5800,  baseLuck: 6800  },
  { name: "Medusa",                 rarity: "R",    servantClass: "Rider",     np: "Bellerophon",              baseAtk: 6800,  baseDef: 5500,  baseMana: 5200,  baseLuck: 6200  },
  { name: "Asterios",               rarity: "R",    servantClass: "Berserker", np: "Chaos Labyrinthos",        baseAtk: 7500,  baseDef: 4500,  baseMana: 4200,  baseLuck: 4500  },
  { name: "Arash",                  rarity: "R",    servantClass: "Archer",    np: "Stella",                   baseAtk: 6200,  baseDef: 4800,  baseMana: 5000,  baseLuck: 7500  },
  { name: "Leonidas",               rarity: "R",    servantClass: "Lancer",    np: "Thermopylae Enomotia",     baseAtk: 6000,  baseDef: 7200,  baseMana: 4800,  baseLuck: 5800  },
  { name: "Ushiwakamaru",           rarity: "R",    servantClass: "Rider",     np: "Tenma Yūgoken",            baseAtk: 6800,  baseDef: 5200,  baseMana: 5500,  baseLuck: 6500  },
  { name: "Euryale",                rarity: "R",    servantClass: "Archer",    np: "Eye of the Euryale",       baseAtk: 6000,  baseDef: 5000,  baseMana: 6000,  baseLuck: 7000  },
  { name: "Boudica",                rarity: "R",    servantClass: "Rider",     np: "Chariot of Boudicca",      baseAtk: 5800,  baseDef: 6500,  baseMana: 5200,  baseLuck: 6000  },
  { name: "Altera",                 rarity: "R",    servantClass: "Saber",     np: "Photon Ray",               baseAtk: 7200,  baseDef: 5000,  baseMana: 5500,  baseLuck: 5500  },
];

const CLASS_MULTIPLIERS: { [cls: string]: { atk: number; def: number; mana: number; luck: number } } = {
  Saber:     { atk: 1.10, def: 1.10, mana: 1.00, luck: 1.00 },
  Archer:    { atk: 1.05, def: 1.00, mana: 1.05, luck: 1.10 },
  Lancer:    { atk: 1.15, def: 0.95, mana: 1.00, luck: 1.05 },
  Rider:     { atk: 1.00, def: 1.05, mana: 1.05, luck: 1.15 },
  Caster:    { atk: 0.90, def: 1.00, mana: 1.30, luck: 1.05 },
  Assassin:  { atk: 1.05, def: 0.95, mana: 1.10, luck: 1.15 },
  Berserker: { atk: 1.30, def: 0.75, mana: 0.90, luck: 0.80 },
  Ruler:     { atk: 1.00, def: 1.20, mana: 1.10, luck: 1.10 },
};

const CLASS_NP_FLAVOR: { [cls: string]: string } = {
  Saber:     "charges with radiant sword energy",
  Archer:    "fires a storm of magical projectiles",
  Lancer:    "hurls a spear wreathed in cursed light",
  Rider:     "summons a divine beast and charges",
  Caster:    "weaves a reality-altering thaumaturgic formula",
  Assassin:  "vanishes into shadow and strikes vitals",
  Berserker: "enters a complete berserk frenzy",
  Ruler:     "invokes divine authority over the battlefield",
};

const WEAPON_ITEMS: { [id: string]: { name: string; cost: number; atkBonus: number; defBonus: number; manaBonus: number; effect: string } } = {
  "W001": { name: "Iron Sword",           cost: 500,    atkBonus: 50,    defBonus: 0,     manaBonus: 0,    effect: "Basic iron sword" },
  "W002": { name: "Bronze Spear",         cost: 800,    atkBonus: 70,    defBonus: 0,     manaBonus: 0,    effect: "Light throwing spear" },
  "W003": { name: "Silver Bow",           cost: 1200,   atkBonus: 90,    defBonus: 0,     manaBonus: 20,   effect: "Magical silver arrows" },
  "W004": { name: "Mithril Blade",        cost: 2500,   atkBonus: 150,   defBonus: 30,    manaBonus: 0,    effect: "+30 DEF on equip" },
  "W005": { name: "Runic Dagger",         cost: 3500,   atkBonus: 180,   defBonus: 0,     manaBonus: 50,   effect: "Rune-etched for mana conductance" },
  "W006": { name: "Shadow Lance",         cost: 5000,   atkBonus: 250,   defBonus: 0,     manaBonus: 0,    effect: "Forged from shadow iron" },
  "W007": { name: "Celestial Staff",      cost: 6000,   atkBonus: 100,   defBonus: 50,    manaBonus: 200,  effect: "Amplifies Caster spells" },
  "W008": { name: "Dragonbone Axe",       cost: 7500,   atkBonus: 350,   defBonus: 0,     manaBonus: 0,    effect: "Carved from dragon remains" },
  "W009": { name: "Knight's Longsword",   cost: 9000,   atkBonus: 400,   defBonus: 80,    manaBonus: 0,    effect: "Noble Knight heirloom" },
  "W010": { name: "Void Quiver",          cost: 10000,  atkBonus: 420,   defBonus: 0,     manaBonus: 100,  effect: "Arrows never miss at close range" },
  "W011": { name: "Mystic Grimoire",      cost: 12000,  atkBonus: 200,   defBonus: 100,   manaBonus: 400,  effect: "Ancient spell compendium" },
  "W012": { name: "Caladbolg",            cost: 15000,  atkBonus: 600,   defBonus: 100,   manaBonus: 0,    effect: "Spiral sword of Irish legend" },
  "W013": { name: "Fragarach",            cost: 18000,  atkBonus: 700,   defBonus: 150,   manaBonus: 0,    effect: "The Retaliator — counters any blow" },
  "W014": { name: "Arondight",            cost: 22000,  atkBonus: 850,   defBonus: 200,   manaBonus: 50,   effect: "Lancelot's holy sword" },
  "W015": { name: "Durandal",             cost: 25000,  atkBonus: 950,   defBonus: 250,   manaBonus: 0,    effect: "Unbreakable paladin sword" },
  "W016": { name: "Rhongomyniad",         cost: 30000,  atkBonus: 1100,  defBonus: 300,   manaBonus: 100,  effect: "Knights of the Round Table spear" },
  "W017": { name: "Gate of Babylon Key",  cost: 40000,  atkBonus: 1500,  defBonus: 500,   manaBonus: 500,  effect: "Opens the treasury of heroes" },
  "W018": { name: "Ea (Partial)",         cost: 60000,  atkBonus: 2500,  defBonus: 800,   manaBonus: 800,  effect: "Fragment of the sword of rupture" },
  "W019": { name: "Avalon Scabbard",      cost: 80000,  atkBonus: 1000,  defBonus: 3000,  manaBonus: 1000, effect: "Legendary scabbard, near-immortality" },
  "W020": { name: "Ea (True Form)",       cost: 500000, atkBonus: 15000, defBonus: 5000,  manaBonus: 5000, effect: "The Sword That Cleaved the World" },
};

const POTION_ITEMS: { [id: string]: { name: string; cost: number; effect: string; statBoost?: { atk?: number; def?: number; mana?: number; luck?: number }; npBoost?: number } } = {
  "P001": { name: "Minor Mana Prism",     cost: 200,   effect: "+20 Mana",                statBoost: { mana: 20 } },
  "P002": { name: "Battle Tonic",         cost: 350,   effect: "+30 ATK",                 statBoost: { atk: 30 } },
  "P003": { name: "Iron Flesh Draught",   cost: 350,   effect: "+30 DEF",                 statBoost: { def: 30 } },
  "P004": { name: "Fortune Elixir",       cost: 500,   effect: "+25 Luck",                statBoost: { luck: 25 } },
  "P005": { name: "Greater Mana Vial",    cost: 800,   effect: "+100 Mana",               statBoost: { mana: 100 } },
  "P006": { name: "Berserker's Rage",     cost: 1000,  effect: "+150 ATK, -50 DEF",       statBoost: { atk: 150, def: -50 } },
  "P007": { name: "NP Charge Potion",     cost: 1500,  effect: "+25 NP Charge",           npBoost: 25 },
  "P008": { name: "Grail Fragment Tonic", cost: 5000,  effect: "+500 to all stats",       statBoost: { atk: 500, def: 500, mana: 500, luck: 500 } },
  "P009": { name: "Command Seal Elixir",  cost: 8000,  effect: "Fully charges NP to 100", npBoost: 100 },
  "P010": { name: "Heroic Essence",       cost: 20000, effect: "+2000 to all stats",      statBoost: { atk: 2000, def: 2000, mana: 2000, luck: 2000 } },
};

const SKILL_DEFS: { [id: string]: { name: string; description: string; cost: number; unlockReq: string; effect: string } } = {
  "SK01": { name: "Mana Burst",          description: "Infuse weapon with mana for +20% ATK in next battle",       cost: 3000,  unlockReq: "Level 10",  effect: "atk_burst"       },
  "SK02": { name: "Eye of the Mind",     description: "Predict enemy attacks — +15% dodge chance",                 cost: 4000,  unlockReq: "Level 15",  effect: "dodge_boost"     },
  "SK03": { name: "Instinct",            description: "Raise NP charge rate by 10% per battle",                   cost: 5000,  unlockReq: "Level 20",  effect: "np_regen"        },
  "SK04": { name: "Charisma",            description: "Chaldea allies gain +10% power in raids",                  cost: 6000,  unlockReq: "Level 25",  effect: "raid_aura"       },
  "SK05": { name: "Battle Continuation", description: "Survive one killing blow per dungeon",                     cost: 8000,  unlockReq: "Level 30",  effect: "survive_once"    },
  "SK06": { name: "Divinity",            description: "+10% damage vs divine enemies",                            cost: 10000, unlockReq: "Level 35",  effect: "divine_slayer"   },
  "SK07": { name: "Magic Resistance",    description: "Reduce Caster enemy damage by 25%",                       cost: 12000, unlockReq: "Level 40",  effect: "anti_caster"     },
  "SK08": { name: "Independent Action",  description: "Battle without cooldown once every 12 hours",              cost: 15000, unlockReq: "Level 50",  effect: "cooldown_bypass" },
  "SK09": { name: "Transformation",      description: "Change servant class once per day",                       cost: 20000, unlockReq: "Level 60",  effect: "class_change"    },
  "SK10": { name: "Heroic Spirit Core",  description: "All stats +25% permanently",                              cost: 50000, unlockReq: "Level 80",  effect: "stat_amplify"    },
};

const SINGULARITIES = [
  { id: 0, name: "Fuyuki",    boss: "Saber Alter",          bossAtk: 8000,   expReward: 1000,  coinsReward: 500   },
  { id: 1, name: "Orleans",   boss: "Jeanne Alter",         bossAtk: 12000,  expReward: 2000,  coinsReward: 1000  },
  { id: 2, name: "Septem",    boss: "Romulus",              bossAtk: 18000,  expReward: 3500,  coinsReward: 2000  },
  { id: 3, name: "Okeanos",   boss: "Blackbeard",           bossAtk: 25000,  expReward: 5000,  coinsReward: 3500  },
  { id: 4, name: "London",    boss: "Nikola Tesla (Enemy)", bossAtk: 35000,  expReward: 8000,  coinsReward: 5000  },
  { id: 5, name: "Camelot",   boss: "Ozymandias (Enemy)",   bossAtk: 50000,  expReward: 12000, coinsReward: 8000  },
  { id: 6, name: "Babylonia", boss: "Tiamat",               bossAtk: 75000,  expReward: 20000, coinsReward: 12000 },
  { id: 7, name: "Solomon",   boss: "Goetia",               bossAtk: 120000, expReward: 50000, coinsReward: 30000 },
];

const FATE_TITLES: { id: string; label: string; how: string }[] = [
  { id: "first_summoning", label: "✨ Newly Summoned",      how: "Complete registration"            },
  { id: "grail_seeker",    label: "🏆 Grail Seeker",        how: "Obtain your first Holy Grail"    },
  { id: "grail_king",      label: "👑 Grail King",           how: "Obtain 10 Holy Grails"           },
  { id: "singularity_1",   label: "⚔️ Fuyuki Survivor",     how: "Clear Fuyuki Singularity"        },
  { id: "singularity_7",   label: "🌟 Grand Order Complete", how: "Clear all 8 Singularities"       },
  { id: "bond_master",     label: "💫 Bond Master",          how: "Reach Bond Level 10"             },
  { id: "battle_veteran",  label: "🗡️ Battle Veteran",       how: "Win 100 battles"                 },
  { id: "np_unleashed",    label: "💥 NP Unleashed",         how: "Unleash your Noble Phantasm 10 times" },
  { id: "streak_hero",     label: "🔥 Streak Hero",          how: "7-day daily login streak"        },
  { id: "chaldea_founder", label: "🏰 Chaldea Founder",      how: "Create a Chaldea"                },
  { id: "duel_champion",   label: "⚡ Duel Champion",        how: "Win 20 servant duels"            },
  { id: "weapon_master",   label: "🔱 Weapon Master",        how: "Max upgrade any weapon"          },
  { id: "xxsr_holder",     label: "🌌 King of Heroes",       how: "Obtain an XXSR servant card"     },
];

const BATTLE_ENEMIES = [
  { name: "Shadow Assassin",       atk: 800,   def: 600,  expReward: 120,  coinReward: 80   },
  { name: "Corrupted Lancer",      atk: 1200,  def: 800,  expReward: 180,  coinReward: 120  },
  { name: "Rogue Berserker",       atk: 2000,  def: 500,  expReward: 250,  coinReward: 180  },
  { name: "Ancient Golem",         atk: 1500,  def: 2000, expReward: 300,  coinReward: 200  },
  { name: "Wraith Knight",         atk: 2500,  def: 1200, expReward: 350,  coinReward: 250  },
  { name: "Demonic Caster",        atk: 1800,  def: 900,  expReward: 400,  coinReward: 300  },
  { name: "Singularity Remnant",   atk: 3000,  def: 2000, expReward: 500,  coinReward: 400  },
  { name: "Fallen Paladin",        atk: 3500,  def: 2500, expReward: 600,  coinReward: 500  },
  { name: "Cursed Rider",          atk: 4000,  def: 3000, expReward: 750,  coinReward: 600  },
  { name: "Phantasmal Beast",      atk: 6000,  def: 4000, expReward: 1000, coinReward: 800  },
  { name: "Divine Spirit Fragment", atk: 8000, def: 5000, expReward: 1500, coinReward: 1200 },
  { name: "Beast of Alaya",        atk: 12000, def: 8000, expReward: 2500, coinReward: 2000 },
];

const activeGrailWars  = new Map<string, { participants: string[]; initiatorID: string; expiresAt: number; round: number }>();
const activeRaidsFate  = new Map<string, { participants: string[]; initiatorID: string; expiresAt: number }>();
const activeSurgesFate = new Map<string, { expiresAt: number; claimedBy: string | null }>();

function calcLevel(exp: number): number { return Math.max(1, Math.floor(exp / 1500) + 1); }

function servantPower(s: ServantData): number {
  const st = s.stats || { atk: 100, def: 100, mana: 100, luck: 100 };
  return Math.max(0, Number(st.atk) || 0) * 1.0
       + Math.max(0, Number(st.def) || 0) * 0.6
       + Math.max(0, Number(st.mana) || 0) * 0.5
       + Math.max(0, Number(st.luck) || 0) * 0.3;
}

function isDevUser(userID: string): boolean { return userID === DEV_UID; }

function checkAndGrantFateTitles(s: ServantData): string[] {
  const newOnes: string[] = [];
  s.titles = s.titles || [];
  const grant = (id: string) => { if (!s.titles.includes(id)) { s.titles.push(id); newOnes.push(id); } };
  if (s.name)                            grant("first_summoning");
  if ((s.holyGrails || 0) >= 1)         grant("grail_seeker");
  if ((s.holyGrails || 0) >= 10)        grant("grail_king");
  if ((s.singularityProgress || 0) >= 1) grant("singularity_1");
  if ((s.singularityProgress || 0) >= 8) grant("singularity_7");
  if ((s.bondLevel || 0) >= 10)         grant("bond_master");
  if ((s.totalBattleWins || 0) >= 100)  grant("battle_veteran");
  if ((s.rarity || "") === "XXSR")      grant("xxsr_holder");
  if (s.servantCard === "Enkidu")       grant("enkidu_owner");
  if ((s.grailWarWins || 0) >= 20)      grant("duel_champion");
  if ((s.loginStreak || 0) >= 7)        grant("streak_hero");
  return newOnes;
}

function titleLine(newTitles: string[]): string {
  if (newTitles.length === 0) return "";
  return "\n\n🎖️ New Title(s) Unlocked: " + newTitles.map(id => FATE_TITLES.find(t => t.id === id)?.label || id).join(", ");
}

async function getServantData(db: any, userID: string): Promise<ServantData> {
  const col = db.db("fate_servants");
  let s = await col.findOne({ userID });
  if (!s) {
    s = {
      userID, name: undefined, servantClass: undefined, servantCard: undefined, rarity: undefined,
      level: 1, exp: 0, bondLevel: 0, stats: { atk: 100, def: 100, mana: 100, luck: 100 },
      holyGrails: 0, gems: 0, goldCoins: 0,
      inventory: { weapons: {}, potions: {}, materials: {} },
      npCharge: 0, npName: undefined, skills: [], quests: {},
      dailyCooldown: 0, lastLoginDate: "", loginStreak: 0,
      battleCooldown: 0, questCooldown: 0, singularityProgress: 0,
      grailWarWins: 0, totalBattleWins: 0, chaldea: undefined,
      titles: [], activeTitle: undefined, weaponUpgrades: {}, disabled: false,
    };
    await saveServantData(db, userID, s);
  }
  return s;
}

async function saveServantData(db: any, userID: string, data: ServantData): Promise<void> {
  await db.db("fate_servants").updateOne({ userID }, { $set: data }, { upsert: true });
}

function applyDevBuff(s: ServantData): void {
  s.servantCard = "King Gilgamesh"; s.servantClass = "Archer"; s.rarity = "XXSR";
  s.npName = "Enuma Elish"; s.npCharge = 100; s.holyGrails = 999;
  s.gems = 999999; s.goldCoins = 999999999; s.bondLevel = 20;
  s.singularityProgress = 8; s.grailWarWins = 9999; s.totalBattleWins = 99999;
  s.stats = { atk: 99000000000, def: 99000000000, mana: 99000000000, luck: 99000000000 };
  s.skills = Object.keys(SKILL_DEFS); s.titles = FATE_TITLES.map(t => t.id);
  s.level = 9999; s.exp = 99999999;
  for (const id of Object.keys(WEAPON_ITEMS)) {
    s.inventory.weapons[id] = { name: WEAPON_ITEMS[id].name, level: 10, qty: 1 };
    s.weaponUpgrades[id] = 10;
  }
  for (const id of Object.keys(POTION_ITEMS)) s.inventory.potions[id] = 999;
  for (const qk of ["battle_novice","battle_adept","battle_veteran","singularity_fuyuki","first_grail","bond_5","np_10","duel_5"]) {
    s.quests[qk] = { goal: 1, progress: 1, reward: 0, completed: true, description: "Dev complete" };
  }
}

function styled(header: string, symbol: string, body: string): string {
  return AuroraBetaStyler.styleOutput({
    headerText: header, headerSymbol: symbol, headerStyle: "bold",
    bodyText: body, bodyStyle: "bold",
    footerText: "Developed by: **Aljur pogoy**",
  });
}

const fateCommand: ShadowBot.Command = {
  config: {
    name: "fate",
    description: "Fate/Grand Order — become a Heroic Spirit and fight in the Holy Grail War!",
    usage: "fate register <n> | fate status | fate summon | fate battle | ...",
    aliases: ["fgo"],
    category: "Games 🎮",
  },

  run: async ({ api, event, args, db }) => {
    if (!db) { await reply({ message: "Database not available." }); return; }

    const { threadID, messageID, senderID } = event;
    const action      = args[0]?.toLowerCase();
    const currentTime = Math.floor(Date.now() / 1000);
    const isDev       = isDevUser(senderID.toString());

    let s = await getServantData(db, senderID.toString());
    if (isDev && s.name) { applyDevBuff(s); await saveServantData(db, senderID.toString(), s); }

    if (s.disabled && !isDev) {
      await api.sendMessage(styled("Fate/Grand Order", "🚫", "You are banned from using Fate commands."), threadID, messageID);
      return;
    }

    if (action === "register") {
      if (s.name) {
        await api.sendMessage(styled("Fate Registration", "🛑", `You are already registered as ${s.name}. Use fate status to check your stats.`), threadID, messageID);
        return;
      }
      const regName = args.slice(1).join(" ").trim();
      if (!regName || regName.length < 2 || regName.length > 30) {
        await api.sendMessage(styled("Fate Registration", "⚠️", "Please provide a valid name (2–30 characters).\nUsage: fate register <n>"), threadID, messageID);
        return;
      }
      if (isDev) {
        s.name = regName; applyDevBuff(s);
        const newTitles = checkAndGrantFateTitles(s);
        await saveServantData(db, senderID.toString(), s);
        await api.sendMessage(styled("Fate Registration", "👑",
          `👑 DEVELOPER ACCOUNT CREATED\n\nServant: ${regName}\nCard: King Gilgamesh [XXSR]\nATK: 99,000,000,000 | DEF: 99,000,000,000\nHoly Grails: 999 | Gems: 999,999 | Gold: 999,999,999${titleLine(newTitles)}`
        ), threadID, messageID);
        return;
      }
      const classList = Object.keys(CLASS_MULTIPLIERS).map((c, i) => `${i + 1}. ${c}`).join("\n");
      const { messageID: regMsgID } = await createReply(api, {
        threadID,
        messageID,
        message: styled("Fate Registration", "⚗️",
          `Welcome, Heroic Spirit ${regName}!\n\nChoose your Servant Class by replying with its number:\n\n${classList}\n\nEach class has different stat multipliers.\nReply with a number to continue.`
        ),
        keepAlive: true,
        authorID: senderID,
        callback: async ({ api, event, end, reply }: any) => {
          const classNames = Object.keys(CLASS_MULTIPLIERS);
          const choice = parseInt(event.body?.trim());
          if (isNaN(choice) || choice < 1 || choice > classNames.length) {
            await reply({
              message: styled("Fate Registration", "⚠️", "Invalid choice. Reply with a number from the list."),
              callback: async (ctx: any) => { await ctx.reply({ message: styled("Fate Registration", "⚠️", "Still invalid. Reply with a number."), callback: ctx.data.rootCallback }); },
            });
            return;
          }
          end();
          const chosenClass = classNames[choice - 1];
          const mult    = CLASS_MULTIPLIERS[chosenClass];
          const pool    = SERVANT_POOL.filter(sv => sv.servantClass === chosenClass && sv.rarity !== "XXSR");
          const rPool   = pool.length > 0 ? pool : SERVANT_POOL.filter(sv => sv.rarity === "R");
          const assigned = rPool[Math.floor(Math.random() * rPool.length)];
          const fresh   = await getServantData(db, event.senderID);
          if (fresh.name) { await reply({ message: styled("Fate Registration", "🛑", "You are already registered.") }); return; }
          fresh.name = regName; fresh.servantClass = chosenClass; fresh.servantCard = assigned.name;
          fresh.rarity = assigned.rarity; fresh.npName = assigned.np;
          fresh.stats = {
            atk:  Math.floor(assigned.baseAtk  * mult.atk),
            def:  Math.floor(assigned.baseDef  * mult.def),
            mana: Math.floor(assigned.baseMana * mult.mana),
            luck: Math.floor(assigned.baseLuck * mult.luck),
          };
          fresh.gems = 30; fresh.goldCoins = 500; fresh.holyGrails = 0; fresh.npCharge = 0; fresh.level = 1; fresh.exp = 0;
          const newTitles = checkAndGrantFateTitles(fresh);
          await saveServantData(db, event.senderID, fresh);
          await api.sendMessage(styled("Fate Registration", "✅",
            `Registration complete!\n\nServant: ${regName}\nCard: ${assigned.name} [${assigned.rarity}]\nClass: ${chosenClass}\nNP: ${assigned.np}\n\nATK: ${fresh.stats.atk} | DEF: ${fresh.stats.def}\nMana: ${fresh.stats.mana} | Luck: ${fresh.stats.luck}\n\nStarting Gems: 30 💎 | Gold: 500 🪙\n\n${titleLine(newTitles)}\n\nUse fate battle to begin!\nUse fate summon to roll for a better servant.`
          ), event.threadID, event.messageID);
        },
      }) as any;
      return;
    }

    if (!s.name && action !== "register") {
      await api.sendMessage(styled("Fate/Grand Order", "⚠️", "You need to register first!\nUsage: fate register <n>"), threadID, messageID);
      return;
    }

    if (action === "status") {
      const power = isDev ? "99,000,000,000+" : servantPower(s).toFixed(0);
      const activeTitle = s.activeTitle ? (FATE_TITLES.find(t => t.id === s.activeTitle)?.label || "") : "";
      const equippedWeapons = Object.entries(s.inventory.weapons).map(([id, w]) => `  ${WEAPON_ITEMS[id]?.name || id} Lv.${w.level}`).join("\n") || "  None";
      const nextSing = s.singularityProgress < 8 ? `Next: ${SINGULARITIES[s.singularityProgress]?.name || "Grand Order Complete"}` : "All Singularities Cleared ✅";
      const npBar = "█".repeat(Math.floor((s.npCharge || 0) / 10)) + "░".repeat(10 - Math.floor((s.npCharge || 0) / 10));
      await api.sendMessage(styled("Servant Status", "⚗️",
        `${activeTitle ? activeTitle + "\n" : ""}👤 ${s.name} ${isDev ? "👑 [DEVELOPER]" : ""}
📛 Card: ${s.servantCard || "—"} [${s.rarity || "—"}]
⚔️ Class: ${s.servantClass || "—"}
💥 Noble Phantasm: ${s.npName || "—"}

📊 STATS
  ATK:  ${Number(s.stats.atk).toLocaleString()}
  DEF:  ${Number(s.stats.def).toLocaleString()}
  Mana: ${Number(s.stats.mana).toLocaleString()}
  Luck: ${Number(s.stats.luck).toLocaleString()}
  Power: ${power}

🎖️ Level: ${s.level} | EXP: ${s.exp.toLocaleString()}
💛 Bond: Lv.${s.bondLevel}/20
⚡ NP Charge: [${npBar}] ${s.npCharge}%

💎 Gems: ${s.gems.toLocaleString()}
🪙 Gold Coins: ${s.goldCoins.toLocaleString()}
🏆 Holy Grails: ${s.holyGrails}
🏰 Chaldea: ${s.chaldea || "None"}

📖 Singularity: ${nextSing}
🗡️ Battle Wins: ${s.totalBattleWins.toLocaleString()}
🌀 Skills: ${s.skills.length}/${Object.keys(SKILL_DEFS).length} unlocked

🔱 Equipped Weapons:\n${equippedWeapons}`
      ), threadID, messageID);
      return;
    }

    if (action === "summon") {
      const SUMMON_COST = 10;
      if (s.gems < SUMMON_COST && !isDev) {
        await api.sendMessage(styled("Servant Summoning", "❌", `Not enough Gems! Summoning costs ${SUMMON_COST} 💎.\nYou have: ${s.gems} 💎`), threadID, messageID);
        return;
      }
      if (!isDev) s.gems -= SUMMON_COST;
      const roll = Math.random() * 100;
      let rarityPicked: string;
      if (roll < 1) rarityPicked = "XXSR";
      else if (roll < 3) rarityPicked = "SSSR";
      else if (roll < 10) rarityPicked = "SSR";
      else if (roll < 35) rarityPicked = "SR";
      else rarityPicked = "R";
      const pool   = SERVANT_POOL.filter(sv => sv.rarity === rarityPicked);
      const picked = pool[Math.floor(Math.random() * pool.length)];
      const mult   = CLASS_MULTIPLIERS[picked.servantClass] || CLASS_MULTIPLIERS["Saber"];
      const currentRarityIdx = RARITY_ORDER.indexOf(s.rarity || "R");
      const pickedRarityIdx  = RARITY_ORDER.indexOf(picked.rarity);
      let resultText: string;
      if (pickedRarityIdx >= currentRarityIdx) {
        s.servantCard = picked.name; s.rarity = picked.rarity; s.npName = picked.np; s.servantClass = picked.servantClass;
        s.stats = {
          atk:  Math.floor(picked.baseAtk  * mult.atk  * (1 + (s.bondLevel || 0) * 0.02)),
          def:  Math.floor(picked.baseDef  * mult.def  * (1 + (s.bondLevel || 0) * 0.02)),
          mana: Math.floor(picked.baseMana * mult.mana * (1 + (s.bondLevel || 0) * 0.02)),
          luck: Math.floor(picked.baseLuck * mult.luck * (1 + (s.bondLevel || 0) * 0.02)),
        };
        resultText = `🎉 NEW SERVANT OBTAINED!\n${picked.name} [${picked.rarity}]\nClass: ${picked.servantClass}\nNP: ${picked.np}\nATK: ${s.stats.atk.toLocaleString()} | DEF: ${s.stats.def.toLocaleString()}\n\nThis is an upgrade from your previous servant!`;
      } else {
        s.goldCoins += 500;
        resultText = `You summoned: ${picked.name} [${picked.rarity}]\nClass: ${picked.servantClass}\n\nYour current servant (${s.servantCard}) is stronger.\n+500 🪙 Gold consolation.`;
      }
      const newTitles = checkAndGrantFateTitles(s);
      await saveServantData(db, senderID.toString(), s);
      await api.sendMessage(styled("Servant Summoning", "✨",
        `Summoning Circle Activated!\n\n${rarityPicked === "XXSR" ? "🌌 LEGENDARY PULL! 🌌" : rarityPicked === "SSSR" ? "⭐ ULTRA RARE PULL! ⭐" : rarityPicked === "SSR" ? "💫 RARE PULL!" : ""}\n\n${resultText}${titleLine(newTitles)}`
      ), threadID, messageID);
      return;
    }

    if (action === "buyenkidu") {
      if (s.servantCard === "Enkidu" && s.rarity === "XXSR") {
        await api.sendMessage(styled("Enkidu [XXSR]", "🌿", "You already possess Enkidu!"), threadID, messageID); return;
      }
      if (isDev) {
        s.servantCard = "Enkidu"; s.rarity = "XXSR"; s.npName = "Enuma Elish (Chains)"; s.servantClass = "Lancer";
        s.stats = { atk: 95000000000, def: 95000000000, mana: 95000000000, luck: 95000000000 };
        const newTitles = checkAndGrantFateTitles(s);
        await saveServantData(db, senderID.toString(), s);
        await api.sendMessage(styled("Enkidu [XXSR]", "🌿", `Developer perk — Enkidu obtained for free!${titleLine(newTitles)}`), threadID, messageID);
        return;
      }
      if (s.gems < ENKIDU_GEMS_COST || s.goldCoins < ENKIDU_COINS_COST) {
        await api.sendMessage(styled("Enkidu [XXSR]", "🌿",
          `Enkidu is an ultra-exclusive XXSR Servant.\n\nRequired:\n💎 ${ENKIDU_GEMS_COST.toLocaleString()} Gems\n🪙 ${ENKIDU_COINS_COST.toLocaleString()} Gold Coins\n\nYour balance:\n💎 ${s.gems.toLocaleString()} Gems\n🪙 ${s.goldCoins.toLocaleString()} Gold Coins`
        ), threadID, messageID); return;
      }
      s.gems -= ENKIDU_GEMS_COST; s.goldCoins -= ENKIDU_COINS_COST;
      s.servantCard = "Enkidu"; s.rarity = "XXSR"; s.npName = "Enuma Elish (Chains)"; s.servantClass = "Lancer";
      s.stats = { atk: 95000000000, def: 95000000000, mana: 95000000000, luck: 95000000000 };
      const enkiduTitles = checkAndGrantFateTitles(s);
      await saveServantData(db, senderID.toString(), s);
      await api.sendMessage(styled("Enkidu [XXSR]", "🌿",
        `The chains of heaven descend...\n\n🌿 ENKIDU OBTAINED! 🌿\n\nCard: Enkidu [XXSR]\nClass: Lancer\nNP: Enuma Elish (Chains)${titleLine(enkiduTitles)}`
      ), threadID, messageID);
      return;
    }

    if (action === "class") {
      const chosen = args.slice(1).map(a => a.charAt(0).toUpperCase() + a.slice(1).toLowerCase()).join(" ");
      if (!chosen || !CLASS_MULTIPLIERS[chosen]) {
        await api.sendMessage(styled("Class Change", "⚠️", `Invalid class.\nAvailable: ${Object.keys(CLASS_MULTIPLIERS).join(", ")}\nUsage: fate class <ClassName>\nCost: 2,000 🪙`), threadID, messageID); return;
      }
      const COST = isDev ? 0 : 2000;
      if (s.goldCoins < COST) {
        await api.sendMessage(styled("Class Change", "❌", `Not enough Gold! Costs ${COST.toLocaleString()} 🪙.`), threadID, messageID); return;
      }
      if (!isDev) s.goldCoins -= COST;
      const oldClass = s.servantClass; s.servantClass = chosen;
      const mult = CLASS_MULTIPLIERS[chosen];
      const baseCard = SERVANT_POOL.find(sv => sv.name === s.servantCard);
      if (baseCard) {
        s.stats = {
          atk:  Math.floor(baseCard.baseAtk  * mult.atk  * (1 + (s.bondLevel || 0) * 0.02)),
          def:  Math.floor(baseCard.baseDef  * mult.def  * (1 + (s.bondLevel || 0) * 0.02)),
          mana: Math.floor(baseCard.baseMana * mult.mana * (1 + (s.bondLevel || 0) * 0.02)),
          luck: Math.floor(baseCard.baseLuck * mult.luck * (1 + (s.bondLevel || 0) * 0.02)),
        };
      }
      await saveServantData(db, senderID.toString(), s);
      await api.sendMessage(styled("Class Change", "✅",
        `Class changed: ${oldClass} → ${chosen}\n\nATK: ${s.stats.atk.toLocaleString()} | DEF: ${s.stats.def.toLocaleString()}\nMana: ${s.stats.mana.toLocaleString()} | Luck: ${s.stats.luck.toLocaleString()}`
      ), threadID, messageID);
      return;
    }

    if (action === "battle") {
      const COOLDOWN = isDev ? 0 : 30;
      if (!isDev && (s.battleCooldown || 0) > currentTime) {
        await api.sendMessage(styled("Fate Battle", "⏳", `Battle cooldown: ${(s.battleCooldown || 0) - currentTime}s remaining.`), threadID, messageID); return;
      }
      const enemy   = BATTLE_ENEMIES[Math.floor(Math.random() * BATTLE_ENEMIES.length)];
      const myPow   = isDev ? 99000000000 : servantPower(s) * (0.85 + Math.random() * 0.3);
      const enemyPow = (enemy.atk * 0.7 + enemy.def * 0.3) * (0.85 + Math.random() * 0.3);
      const win     = isDev ? true : myPow > enemyPow;
      const npGain  = isDev ? 0 : Math.floor(Math.random() * 15) + 5;
      if (!isDev) s.npCharge = Math.min(100, (s.npCharge || 0) + npGain);
      const expGain  = win ? enemy.expReward + Math.floor(Math.random() * 50) : Math.floor(enemy.expReward * 0.3);
      const coinGain = win ? enemy.coinReward : Math.floor(enemy.coinReward * 0.2);
      s.exp = Math.max(0, Number(s.exp) || 0) + expGain;
      s.level = calcLevel(s.exp); s.goldCoins = Math.max(0, Number(s.goldCoins) || 0) + coinGain;
      if (win) {
        s.totalBattleWins = (s.totalBattleWins || 0) + 1;
        s.stats.atk = Math.max(0, Number(s.stats.atk) || 0) + 50;
        for (const qk of Object.keys(s.quests)) {
          if (!s.quests[qk].completed && s.quests[qk].description.toLowerCase().includes("battle")) {
            s.quests[qk].progress = Math.min(s.quests[qk].goal, s.quests[qk].progress + 1);
            if (s.quests[qk].progress >= s.quests[qk].goal) { s.quests[qk].completed = true; s.goldCoins += s.quests[qk].reward; }
          }
        }
      }
      s.battleCooldown = currentTime + COOLDOWN;
      const newTitles = checkAndGrantFateTitles(s);
      await saveServantData(db, senderID.toString(), s);
      const npBar = "█".repeat(Math.floor((s.npCharge || 0) / 10)) + "░".repeat(10 - Math.floor((s.npCharge || 0) / 10));
      const baseResult = `${win ? "⚔️ VICTORY!" : "💥 DEFEAT!"}\n\n${s.name} [${s.servantClass}] vs ${enemy.name}\nYour Power: ${isDev ? "99B+" : myPow.toFixed(0)} | Enemy: ${enemyPow.toFixed(0)}\n\n${win ? `+${expGain} EXP | +${coinGain} 🪙 | +50 ATK` : `+${expGain} EXP (consolation) | +${coinGain} 🪙`}\nLevel: ${s.level} | NP: [${npBar}] ${s.npCharge}%${titleLine(newTitles)}`;
      if (win && (s.npCharge >= 100 || isDev)) {
        await createReply(api, {
          threadID, messageID,
          message: styled("Fate Battle", "⚔️",
            `${baseResult}\n\n💥 NP FULLY CHARGED!\nReply 'unleash' to activate ${s.npName}!\nOr reply 'save' to hold your charge.`
          ),
          keepAlive: false,
          authorID: senderID,
          callback: async ({ api, event, reply, end }: any) => {
            end();
            const reply = event.body?.toLowerCase().trim();
            if (reply === "unleash") {
              const fresh = await getServantData(db, senderID.toString());
              if (isDev) applyDevBuff(fresh);
              const npDmg = isDev ? "99,000,000,000" : (servantPower(fresh) * (2.5 + Math.random())).toFixed(0);
              const grailChance = Math.random() < 0.15 || isDev;
              if (grailChance) fresh.holyGrails = (fresh.holyGrails || 0) + 1;
              fresh.npCharge = 0;
              const npTitles = checkAndGrantFateTitles(fresh);
              await saveServantData(db, senderID.toString(), fresh);
              await api.sendMessage(styled("Noble Phantasm", "💥",
                `✨ ${fresh.npName || "Noble Phantasm"} ✨\n\n${fresh.name} ${CLASS_NP_FLAVOR[fresh.servantClass || "Saber"] || "unleashes ultimate power"}!\n\n💫 NP DAMAGE: ${npDmg}\n${grailChance ? "🏆 Holy Grail Fragment obtained! Grails: " + fresh.holyGrails : ""}\n\nNP Charge reset to 0.${titleLine(npTitles)}`
              ), event.threadID, event.messageID);
            } else if (reply === "save") {
              await reply({ message: styled("Fate Battle", "💾", `${s.npName} saved for later.`) });
            }
          },
        });
      } else {
        await api.sendMessage(styled("Fate Battle", win ? "⚔️" : "💥", baseResult), threadID, messageID);
      }
      return;
    }

    if (action === "np") {
      if (!isDev && (s.npCharge || 0) < 100) {
        const npBar = "█".repeat(Math.floor((s.npCharge || 0) / 10)) + "░".repeat(10 - Math.floor((s.npCharge || 0) / 10));
        await api.sendMessage(styled("Noble Phantasm", "⚡", `NP not fully charged!\nCharge: [${npBar}] ${s.npCharge}%\n\nFight battles or use P009 to charge.`), threadID, messageID); return;
      }
      const npDmg = isDev ? "99,000,000,000" : (servantPower(s) * (2.5 + Math.random())).toFixed(0);
      const grailChance = Math.random() < 0.15 || isDev;
      if (grailChance) s.holyGrails = (s.holyGrails || 0) + 1;
      if (!isDev) s.npCharge = 0;
      const newTitles = checkAndGrantFateTitles(s);
      await saveServantData(db, senderID.toString(), s);
      await api.sendMessage(styled("Noble Phantasm", "💥",
        `✨ ${s.npName || "Noble Phantasm"} ✨\n\n${s.name} ${CLASS_NP_FLAVOR[s.servantClass || "Saber"] || "unleashes ultimate power"}!\n\n💫 NP DAMAGE: ${npDmg}\n${grailChance ? "🏆 Holy Grail obtained! Grails: " + s.holyGrails : "No grail drop this time."}\n\nNP Charge reset to 0%.${titleLine(newTitles)}`
      ), threadID, messageID);
      return;
    }

    if (action === "duel") {
      const targetName = args.slice(1).join(" ").trim();
      if (!targetName) { await api.sendMessage(styled("Servant Duel", "⚠️", "Usage: fate duel <servantName>"), threadID, messageID); return; }
      const col = db.db("fate_servants");
      const target = await col.findOne({ name: targetName });
      if (!target?.name) { await api.sendMessage(styled("Servant Duel", "❌", `Servant "${targetName}" not found.`), threadID, messageID); return; }
      if (target.userID === senderID.toString()) { await api.sendMessage(styled("Servant Duel", "⚠️", "You cannot duel yourself!"), threadID, messageID); return; }
      const myPow = isDev ? 99000000000 : servantPower(s) * (0.85 + Math.random() * 0.30);
      const thPow = isDevUser(target.userID) ? 99000000000 : servantPower(target as ServantData) * (0.85 + Math.random() * 0.30);
      const win = myPow > thPow;
      if (win) {
        const stake = Math.floor(Math.max(0, Number(target.exp) || 0) * 0.10);
        s.exp = Math.max(0, Number(s.exp) || 0) + stake; s.level = calcLevel(s.exp);
        s.totalBattleWins = (s.totalBattleWins || 0) + 1; s.grailWarWins = (s.grailWarWins || 0) + 1;
        await col.updateOne({ userID: target.userID }, { $set: { exp: Math.max(0, (Number(target.exp) || 0) - stake) } });
      } else {
        const lost = Math.floor(Math.max(0, Number(s.exp) || 0) * 0.05);
        s.exp = Math.max(0, Number(s.exp) - lost); s.level = calcLevel(s.exp);
      }
      const newTitles = checkAndGrantFateTitles(s);
      await saveServantData(db, senderID.toString(), s);
      await api.sendMessage(styled("Servant Duel", win ? "⚔️" : "💥",
        `⚔️ DUEL RESULT\n${s.name} [${s.servantClass}] (${myPow.toFixed(0)}) vs ${targetName} [${target.servantClass}] (${thPow.toFixed(0)})\n\n${win ? `VICTORY! +${Math.floor(Number(target.exp) * 0.10)} EXP stolen.` : `DEFEAT! -${Math.floor(Number(s.exp) * 0.05)} EXP.`}\nLevel: ${s.level}${titleLine(newTitles)}`
      ), threadID, messageID);
      return;
    }

    if (action === "bond") {
      const BOND_CD = isDev ? 0 : 1800;
      if (!isDev && (s.questCooldown || 0) > currentTime) {
        await api.sendMessage(styled("Bond Training", "⏳", `Cooldown: ${Math.ceil(((s.questCooldown || 0) - currentTime) / 60)} minutes remaining.`), threadID, messageID); return;
      }
      if ((s.bondLevel || 0) >= 20) { await api.sendMessage(styled("Bond Training", "💫", "Bond is at MAX LEVEL (20)!"), threadID, messageID); return; }
      const bondGain = isDev ? 20 - (s.bondLevel || 0) : 1;
      s.bondLevel = Math.min(20, (s.bondLevel || 0) + bondGain);
      s.stats.atk = Math.floor(Number(s.stats.atk) * 1.02); s.stats.def = Math.floor(Number(s.stats.def) * 1.02);
      s.stats.mana = Math.floor(Number(s.stats.mana) * 1.02); s.stats.luck = Math.floor(Number(s.stats.luck) * 1.02);
      s.questCooldown = currentTime + BOND_CD;
      const newTitles = checkAndGrantFateTitles(s);
      await saveServantData(db, senderID.toString(), s);
      await api.sendMessage(styled("Bond Training", "💛",
        `Bond with ${s.servantCard} increased!\nBond Level: ${s.bondLevel}/20\n\nAll stats +2%\nATK: ${s.stats.atk.toLocaleString()} | DEF: ${s.stats.def.toLocaleString()}${titleLine(newTitles)}`
      ), threadID, messageID);
      return;
    }

    if (action === "daily") {
      if (!isDev && (s.dailyCooldown || 0) > currentTime) {
        const rem = (s.dailyCooldown || 0) - currentTime;
        await api.sendMessage(styled("Daily Reward", "⏳", `Come back in ${Math.floor(rem / 3600)}h ${Math.ceil((rem % 3600) / 60)}m.`), threadID, messageID); return;
      }
      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (s.lastLoginDate === yesterdayStr) s.loginStreak = (s.loginStreak || 0) + 1;
      else if (s.lastLoginDate !== todayStr) s.loginStreak = 1;
      s.lastLoginDate = todayStr;
      const streak = s.loginStreak || 1; const multiplier = Math.min(streak, 7);
      const gemsReward  = isDev ? 9999 : 5 * multiplier;
      const coinsReward = isDev ? 9999999 : 300 * multiplier;
      const expReward   = isDev ? 999999 : 500 * multiplier;
      s.gems += gemsReward; s.goldCoins += coinsReward; s.exp += expReward;
      s.level = calcLevel(s.exp); s.dailyCooldown = currentTime + 86400;
      const newTitles = checkAndGrantFateTitles(s);
      await saveServantData(db, senderID.toString(), s);
      await api.sendMessage(styled("Daily Reward", "🎁",
        `Daily reward claimed!\n🔥 Streak: ${streak} day(s) — ${multiplier}× multiplier\n\n+${gemsReward} 💎 | +${coinsReward} 🪙 | +${expReward} EXP${titleLine(newTitles)}`
      ), threadID, messageID);
      return;
    }

    if (action === "quest") {
      const hasActive = Object.values(s.quests).some(q => !q.completed);
      if (!hasActive) {
        s.quests = {
          battle_novice:     { goal: 5,  progress: 0, reward: 500,   completed: isDev, description: "Win 5 battles."                         },
          battle_adept:      { goal: 20, progress: 0, reward: 2000,  completed: isDev, description: "Win 20 battles."                        },
          battle_veteran:    { goal: 50, progress: 0, reward: 5000,  completed: isDev, description: "Win 50 battles."                        },
          singularity_fuyuki:{ goal: 1,  progress: 0, reward: 3000,  completed: isDev, description: "Clear the Fuyuki Singularity."          },
          first_grail:       { goal: 1,  progress: 0, reward: 10000, completed: isDev, description: "Obtain your first Holy Grail."          },
          bond_5:            { goal: 5,  progress: 0, reward: 2500,  completed: isDev, description: "Reach Bond Level 5 with your servant."  },
          np_10:             { goal: 10, progress: 0, reward: 4000,  completed: isDev, description: "Unleash your NP 10 times."              },
          duel_5:            { goal: 5,  progress: 0, reward: 3500,  completed: isDev, description: "Win 5 servant duels."                   },
        };
        await saveServantData(db, senderID.toString(), s);
      }
      const questList = Object.entries(s.quests).map(([, q]) =>
        `${q.completed ? "✅" : "🔲"} ${q.description} (${q.progress}/${q.goal}) → ${q.reward.toLocaleString()} 🪙`
      ).join("\n");
      await api.sendMessage(styled("Fate Quests", "📜", `Active Quests:\n\n${questList}\n\nCompleted quests auto-reward Gold Coins.`), threadID, messageID);
      return;
    }

    if (action === "singularity") {
      const idx = s.singularityProgress || 0;
      if (idx >= SINGULARITIES.length) { await api.sendMessage(styled("Singularity", "🌟", "All Singularities cleared! Grand Order complete!"), threadID, messageID); return; }
      const sing = SINGULARITIES[idx];
      const myPow = isDev ? 99000000000 : servantPower(s) * (0.9 + Math.random() * 0.2);
      const bossPow = sing.bossAtk * (0.9 + Math.random() * 0.2);
      const win = isDev || myPow > bossPow;
      if (win) {
        s.singularityProgress = idx + 1; s.exp += sing.expReward; s.goldCoins += sing.coinsReward; s.holyGrails++; s.level = calcLevel(s.exp);
        const newTitles = checkAndGrantFateTitles(s);
        await saveServantData(db, senderID.toString(), s);
        await api.sendMessage(styled("Singularity Cleared!", "🌟",
          `⚔️ ${sing.name.toUpperCase()}\nBoss: ${sing.boss}\n\nVICTORY!\n\n+${sing.expReward.toLocaleString()} EXP | +${sing.coinsReward.toLocaleString()} 🪙 | +1 🏆\n\n${s.singularityProgress < 8 ? `Next: ${SINGULARITIES[s.singularityProgress].name}` : "All Cleared! ✅"}${titleLine(newTitles)}`
        ), threadID, messageID);
      } else {
        await api.sendMessage(styled("Singularity", "💥",
          `⚔️ ${sing.name.toUpperCase()}\nBoss: ${sing.boss}\n\nDEFEAT! Train harder and try again.`
        ), threadID, messageID);
      }
      return;
    }

    if (action === "shop") {
      const shopSub = args[1]?.toLowerCase();

      if (shopSub === "hero") {
        const rarityOrder = ["XXSR", "SSSR", "SSR", "SR", "R"];
        const heroLines = rarityOrder.flatMap(rarity =>
          SERVANT_POOL.filter(sv => sv.rarity === rarity).map(sv => {
            const hid  = Object.entries(HERO_IDS).find(([, n]) => n === sv.name)?.[0] || "?";
            const cost = HERO_COSTS[sv.name];
            const costStr = sv.name === "King Gilgamesh" ? "DEV ONLY" : `${cost.gems.toLocaleString()} 💎 + ${cost.coins.toLocaleString()} 🪙`;
            return `[${hid}] ${sv.name} [${sv.rarity}] ${sv.servantClass} — ${costStr}`;
          })
        ).join("\n");
        await createReply(api, {
          threadID, messageID,
          message: styled("Hero Shop", "🌟", `💎 ${s.gems.toLocaleString()} | 🪙 ${s.goldCoins.toLocaleString()}\n\n${heroLines}\n\nReply: <Hero ID> buy\nExample: H006 buy`),
          keepAlive: true,
          authorID: senderID,
          callback: async ({ api, event, reply, end }: any) => {
            const parts   = event.body?.trim().toUpperCase().split(/\s+/);
            const hid     = parts?.[0];
            const confirm = parts?.[1]?.toLowerCase();
            if (!hid || confirm !== "buy") return;
            const heroName = HERO_IDS[hid];
            if (!heroName) {
              await reply({ message: styled("Hero Shop", "❌", `Invalid Hero ID "${hid}".`), keepAlive: true, callback: async (ctx: any) => {} });
              return;
            }
            if (heroName === "King Gilgamesh") {
              await reply({ message: styled("Hero Shop", "🛑", "King Gilgamesh is exclusive to the developer."), keepAlive: true, callback: async (ctx: any) => {} });
              return;
            }
            const fresh   = await getServantData(db, senderID.toString());
            const devMode = isDevUser(senderID.toString());
            if (devMode) applyDevBuff(fresh);
            const cost = HERO_COSTS[heroName];
            if (!devMode && (fresh.gems < cost.gems || fresh.goldCoins < cost.coins)) {
              await reply({ message: styled("Hero Shop", "❌", `Not enough resources!\nRequired: ${cost.gems.toLocaleString()} 💎 + ${cost.coins.toLocaleString()} 🪙\nYours: ${fresh.gems.toLocaleString()} 💎 | ${fresh.goldCoins.toLocaleString()} 🪙`), keepAlive: true, callback: async (ctx: any) => {} });
              return;
            }
            const heroCard = SERVANT_POOL.find(sv => sv.name === heroName);
            if (!heroCard) return;
            if (!devMode) { fresh.gems -= cost.gems; fresh.goldCoins -= cost.coins; }
            const mult = CLASS_MULTIPLIERS[heroCard.servantClass] || CLASS_MULTIPLIERS["Saber"];
            fresh.servantCard = heroCard.name; fresh.rarity = heroCard.rarity; fresh.npName = heroCard.np; fresh.servantClass = heroCard.servantClass;
            fresh.stats = {
              atk:  Math.floor(heroCard.baseAtk  * mult.atk  * (1 + (fresh.bondLevel || 0) * 0.02)),
              def:  Math.floor(heroCard.baseDef  * mult.def  * (1 + (fresh.bondLevel || 0) * 0.02)),
              mana: Math.floor(heroCard.baseMana * mult.mana * (1 + (fresh.bondLevel || 0) * 0.02)),
              luck: Math.floor(heroCard.baseLuck * mult.luck * (1 + (fresh.bondLevel || 0) * 0.02)),
            };
            const newTitles = checkAndGrantFateTitles(fresh);
            await saveServantData(db, senderID.toString(), fresh);
            await reply({
              message: styled("Hero Shop", "✅", `${heroName} [${heroCard.rarity}] obtained!\nATK: ${fresh.stats.atk.toLocaleString()} | DEF: ${fresh.stats.def.toLocaleString()}\nGems: ${fresh.gems.toLocaleString()} 💎 | Gold: ${fresh.goldCoins.toLocaleString()} 🪙${titleLine(newTitles)}\n\nReply with another Hero ID + buy to keep shopping.`),
              keepAlive: true,
              callback: async (ctx: any) => {},
            });
          },
        });
        return;
      }

      if (shopSub === "list") {
        const weaponLines  = Object.entries(WEAPON_ITEMS).map(([wid, w]) => { const sid = Object.entries(SHOP_IDS).find(([, v]) => v.type === "weapon" && v.ref === wid)?.[0] || "?"; return `[${sid}] ${w.name} — ATK+${w.atkBonus} | ${w.cost.toLocaleString()} 🪙`; }).join("\n");
        const potionLines  = Object.entries(POTION_ITEMS).map(([pid, p]) => { const sid = Object.entries(SHOP_IDS).find(([, v]) => v.type === "potion" && v.ref === pid)?.[0] || "?"; return `[${sid}] ${p.name} — ${p.effect} | ${p.cost.toLocaleString()} 🪙`; }).join("\n");
        const upgradeLines = Object.entries(WEAPON_ITEMS).map(([wid, w]) => { const sid = Object.entries(SHOP_IDS).find(([, v]) => v.type === "upgrade" && v.ref === wid)?.[0] || "?"; const curLvl = s.weaponUpgrades[wid] || 0; return `[${sid}] Upgrade ${w.name} → Lv.${curLvl + 1}/10`; }).join("\n");
        await createReply(api, {
          threadID, messageID,
          message: styled("Item Shop", "🛍️", `💎 ${s.gems.toLocaleString()} | 🪙 ${s.goldCoins.toLocaleString()}\n\n⚔️ WEAPONS\n${weaponLines}\n\n🧪 POTIONS\n${potionLines}\n\n🔱 UPGRADES\n${upgradeLines}\n\nReply: <Shop ID> buy [qty]\nExamples: S101 buy | S201 buy 3 | S301 buy`),
          keepAlive: true,
          authorID: senderID,
          callback: async ({ api, event, reply, end }: any) => {
            const parts   = event.body?.trim().toUpperCase().split(/\s+/);
            const shopId  = parts?.[0];
            const confirm = parts?.[1]?.toLowerCase();
            const qty     = parseInt(parts?.[2] || "1") || 1;
            if (!shopId || confirm !== "buy") return;
            const entry = SHOP_IDS[shopId];
            if (!entry) {
              await reply({ message: styled("Item Shop", "❌", `Invalid Shop ID "${shopId}".`), keepAlive: true, callback: async (ctx: any) => {} });
              return;
            }
            const fresh   = await getServantData(db, senderID.toString());
            const devMode = isDevUser(senderID.toString());
            if (entry.type === "weapon") {
              const w = WEAPON_ITEMS[entry.ref]; const cost = devMode ? 0 : w.cost;
              if (fresh.goldCoins < cost) { await reply({ message: styled("Item Shop", "❌", `Need ${cost.toLocaleString()} 🪙.`), keepAlive: true, callback: async (ctx: any) => {} }); return; }
              if (!devMode) fresh.goldCoins -= cost;
              fresh.inventory.weapons[entry.ref] = { name: w.name, level: 1, qty: 1 };
              fresh.stats.atk += w.atkBonus; fresh.stats.def += w.defBonus; fresh.stats.mana += w.manaBonus;
              const newTitles = checkAndGrantFateTitles(fresh);
              await saveServantData(db, senderID.toString(), fresh);
              await reply({ message: styled("Item Shop", "✅", `Purchased: ${w.name}\n+${w.atkBonus} ATK | +${w.defBonus} DEF | +${w.manaBonus} Mana\nGold: ${fresh.goldCoins.toLocaleString()} 🪙${titleLine(newTitles)}\n\nReply with another ID + buy to continue.`), keepAlive: true, callback: async (ctx: any) => {} });
            } else if (entry.type === "potion") {
              const p = POTION_ITEMS[entry.ref]; const cost = devMode ? 0 : p.cost * qty;
              if (fresh.goldCoins < cost) { await reply({ message: styled("Item Shop", "❌", `Need ${cost.toLocaleString()} 🪙.`), keepAlive: true, callback: async (ctx: any) => {} }); return; }
              if (!devMode) fresh.goldCoins -= cost;
              fresh.inventory.potions[entry.ref] = (fresh.inventory.potions[entry.ref] || 0) + qty;
              await saveServantData(db, senderID.toString(), fresh);
              await reply({ message: styled("Item Shop", "✅", `Purchased: ${p.name} ×${qty}\nGold: ${fresh.goldCoins.toLocaleString()} 🪙\n\nReply with another ID + buy to continue.`), keepAlive: true, callback: async (ctx: any) => {} });
            } else if (entry.type === "upgrade") {
              const w = WEAPON_ITEMS[entry.ref]; const curUpg = fresh.weaponUpgrades[entry.ref] || 0;
              if (curUpg >= 10) { await reply({ message: styled("Item Shop", "🔱", `${w.name} is already MAX (Lv.10)!`), keepAlive: true, callback: async (ctx: any) => {} }); return; }
              if (!fresh.inventory.weapons[entry.ref] && !devMode) { await reply({ message: styled("Item Shop", "❌", `You don't own ${w.name} yet.`), keepAlive: true, callback: async (ctx: any) => {} }); return; }
              const upgCost = devMode ? 0 : Math.floor(w.cost * 0.3 * (curUpg + 1));
              if (fresh.goldCoins < upgCost) { await reply({ message: styled("Item Shop", "❌", `Need ${upgCost.toLocaleString()} 🪙.`), keepAlive: true, callback: async (ctx: any) => {} }); return; }
              if (!devMode) fresh.goldCoins -= upgCost;
              fresh.weaponUpgrades[entry.ref] = curUpg + 1;
              fresh.inventory.weapons[entry.ref] = { name: w.name, level: curUpg + 1, qty: 1 };
              const bonusMult = 0.1 * (curUpg + 1);
              fresh.stats.atk += Math.floor(w.atkBonus * bonusMult); fresh.stats.def += Math.floor(w.defBonus * bonusMult); fresh.stats.mana += Math.floor(w.manaBonus * bonusMult);
              const newTitles = checkAndGrantFateTitles(fresh);
              await saveServantData(db, senderID.toString(), fresh);
              await reply({ message: styled("Item Shop", "🔱", `${w.name} upgraded to Lv.${fresh.weaponUpgrades[entry.ref]}/10!\nGold: ${fresh.goldCoins.toLocaleString()} 🪙${titleLine(newTitles)}\n\nReply with another ID + buy to continue.`), keepAlive: true, callback: async (ctx: any) => {} });
            }
          },
        });
        return;
      }

      await api.sendMessage(styled("Fate Shop", "🛍️",
        `fate shop hero — Browse all Servant heroes\nfate shop list — Browse weapons, potions & upgrades\n\n💎 Gems: ${s.gems.toLocaleString()}\n🪙 Gold: ${s.goldCoins.toLocaleString()}`
      ), threadID, messageID);
      return;
    }

    if (action === "buy") {
      const buyID = args[1]?.toUpperCase(); const buyQty = parseInt(args[2]) || 1;
      if (!buyID || buyQty <= 0) { await api.sendMessage(styled("Fate Shop", "⚠️", "Usage: fate buy <ID> <qty>\nExample: fate buy P001 3"), threadID, messageID); return; }
      const isWeapon = buyID.startsWith("W") && WEAPON_ITEMS[buyID];
      const isPotion = buyID.startsWith("P") && POTION_ITEMS[buyID];
      if (!isWeapon && !isPotion) { await api.sendMessage(styled("Fate Shop", "❌", `Item ID "${buyID}" not found.`), threadID, messageID); return; }
      if (isWeapon) {
        const w = WEAPON_ITEMS[buyID]; const cost = isDev ? 0 : w.cost;
        if (s.goldCoins < cost) { await api.sendMessage(styled("Fate Shop", "❌", `Need ${cost.toLocaleString()} 🪙, you have ${s.goldCoins.toLocaleString()} 🪙.`), threadID, messageID); return; }
        if (!isDev) s.goldCoins -= cost;
        s.inventory.weapons[buyID] = { name: w.name, level: 1, qty: 1 };
        s.stats.atk += w.atkBonus; s.stats.def += w.defBonus; s.stats.mana += w.manaBonus;
        const newTitles = checkAndGrantFateTitles(s);
        await saveServantData(db, senderID.toString(), s);
        await api.sendMessage(styled("Fate Shop", "✅", `Purchased: ${w.name}\n+${w.atkBonus} ATK | +${w.defBonus} DEF\nGold: ${s.goldCoins.toLocaleString()} 🪙${titleLine(newTitles)}`), threadID, messageID);
      } else {
        const p = POTION_ITEMS[buyID]; const cost = isDev ? 0 : p.cost * buyQty;
        if (s.goldCoins < cost) { await api.sendMessage(styled("Fate Shop", "❌", `Need ${cost.toLocaleString()} 🪙.`), threadID, messageID); return; }
        if (!isDev) s.goldCoins -= cost;
        s.inventory.potions[buyID] = (s.inventory.potions[buyID] || 0) + buyQty;
        await saveServantData(db, senderID.toString(), s);
        await api.sendMessage(styled("Fate Shop", "✅", `Purchased: ${p.name} ×${buyQty}\nGold: ${s.goldCoins.toLocaleString()} 🪙`), threadID, messageID);
      }
      return;
    }

    if (action === "use") {
      const useID = args[1]?.toUpperCase(); const useQty = parseInt(args[2]) || 1;
      if (!useID || !POTION_ITEMS[useID]) { await api.sendMessage(styled("Use Item", "⚠️", "Usage: fate use <potionID> <qty>"), threadID, messageID); return; }
      const owned = s.inventory.potions[useID] || 0;
      if (!isDev && owned < useQty) { await api.sendMessage(styled("Use Item", "❌", `You only have ${owned}× ${POTION_ITEMS[useID].name}.`), threadID, messageID); return; }
      const p = POTION_ITEMS[useID];
      if (!isDev) s.inventory.potions[useID] = Math.max(0, owned - useQty);
      if (p.statBoost) {
        s.stats.atk  = Math.max(0, (s.stats.atk  || 0) + (p.statBoost.atk  || 0) * useQty);
        s.stats.def  = Math.max(0, (s.stats.def  || 0) + (p.statBoost.def  || 0) * useQty);
        s.stats.mana = Math.max(0, (s.stats.mana || 0) + (p.statBoost.mana || 0) * useQty);
        s.stats.luck = Math.max(0, (s.stats.luck || 0) + (p.statBoost.luck || 0) * useQty);
      }
      if (p.npBoost) s.npCharge = Math.min(100, (s.npCharge || 0) + p.npBoost * useQty);
      await saveServantData(db, senderID.toString(), s);
      await api.sendMessage(styled("Use Item", "✅", `Used ${useQty}× ${p.name}\nEffect: ${p.effect}\n\nATK: ${s.stats.atk.toLocaleString()} | DEF: ${s.stats.def.toLocaleString()}\nMana: ${s.stats.mana.toLocaleString()} | Luck: ${s.stats.luck.toLocaleString()}\nNP: ${s.npCharge}%`), threadID, messageID);
      return;
    }

    if (action === "upgrade") {
      const upID = args[1]?.toUpperCase();
      if (!upID || !WEAPON_ITEMS[upID]) { await api.sendMessage(styled("Weapon Upgrade", "⚠️", "Usage: fate upgrade <weaponID>"), threadID, messageID); return; }
      if (!s.inventory.weapons[upID] && !isDev) { await api.sendMessage(styled("Weapon Upgrade", "❌", `You don't own ${WEAPON_ITEMS[upID].name}.`), threadID, messageID); return; }
      const curUpg = s.weaponUpgrades[upID] || 0;
      if (curUpg >= 10) { const newTitles = checkAndGrantFateTitles(s); if (newTitles.length > 0) await saveServantData(db, senderID.toString(), s); await api.sendMessage(styled("Weapon Upgrade", "🔱", `${WEAPON_ITEMS[upID].name} is already MAX (Lv.10)!`), threadID, messageID); return; }
      const w = WEAPON_ITEMS[upID]; const upgCost = isDev ? 0 : Math.floor(w.cost * 0.3 * (curUpg + 1));
      if (s.goldCoins < upgCost) { await api.sendMessage(styled("Weapon Upgrade", "❌", `Need ${upgCost.toLocaleString()} 🪙.`), threadID, messageID); return; }
      if (!isDev) s.goldCoins -= upgCost;
      s.weaponUpgrades[upID] = curUpg + 1; s.inventory.weapons[upID] = { name: w.name, level: curUpg + 1, qty: 1 };
      const bonusMult = 0.1 * (curUpg + 1);
      s.stats.atk  += Math.floor(w.atkBonus  * bonusMult);
      s.stats.def  += Math.floor(w.defBonus  * bonusMult);
      s.stats.mana += Math.floor(w.manaBonus * bonusMult);
      const newTitles = checkAndGrantFateTitles(s);
      await saveServantData(db, senderID.toString(), s);
      await api.sendMessage(styled("Weapon Upgrade", "🔱", `${w.name} → Lv.${s.weaponUpgrades[upID]}/10!\nGold: ${s.goldCoins.toLocaleString()} 🪙${titleLine(newTitles)}`), threadID, messageID);
      return;
    }

    if (action === "skill") {
      const skillSub = args[1]?.toLowerCase();
      if (!skillSub || skillSub === "list") {
        const skillList = Object.entries(SKILL_DEFS).map(([id, sk]) =>
          `${(s.skills || []).includes(id) ? "✅" : "🔒"} [${id}] ${sk.name} — ${sk.description}\n       ${sk.unlockReq} | ${sk.cost.toLocaleString()} 🪙`
        ).join("\n");
        await api.sendMessage(styled("Skills", "⚡", `Your Skills: ${(s.skills || []).length}/${Object.keys(SKILL_DEFS).length}\nGold: ${s.goldCoins.toLocaleString()} 🪙\n\n${skillList}\n\nLearn: fate skill learn <ID>`), threadID, messageID);
        return;
      }
      if (skillSub === "learn") {
        const skID = args[2]?.toUpperCase();
        if (!skID || !SKILL_DEFS[skID]) { await api.sendMessage(styled("Skills", "⚠️", "Usage: fate skill learn <ID>"), threadID, messageID); return; }
        if ((s.skills || []).includes(skID)) { await api.sendMessage(styled("Skills", "⚠️", `You already know ${SKILL_DEFS[skID].name}!`), threadID, messageID); return; }
        const sk = SKILL_DEFS[skID]; const cost = isDev ? 0 : sk.cost;
        if (s.goldCoins < cost) { await api.sendMessage(styled("Skills", "❌", `Need ${cost.toLocaleString()} 🪙.`), threadID, messageID); return; }
        if (!isDev) s.goldCoins -= cost;
        s.skills = [...(s.skills || []), skID];
        await saveServantData(db, senderID.toString(), s);
        await api.sendMessage(styled("Skills", "✅", `Skill unlocked: ${sk.name}\n${sk.description}\nGold: ${s.goldCoins.toLocaleString()} 🪙`), threadID, messageID);
        return;
      }
      await api.sendMessage(styled("Skills", "⚠️", "Usage: fate skill list | fate skill learn <ID>"), threadID, messageID);
      return;
    }

    if (action === "title") {
      const titleSub = args[1]?.toLowerCase();
      if (!titleSub || titleSub === "list") {
        const unlocked = s.titles || [];
        const list = FATE_TITLES.map(t => `${unlocked.includes(t.id) ? "✅" : "🔒"} ${t.label} — ${t.how}`).join("\n");
        const active = s.activeTitle ? (FATE_TITLES.find(t => t.id === s.activeTitle)?.label || s.activeTitle) : "None";
        await api.sendMessage(styled("Servant Titles", "🎖️", `Active: ${active}\n\n${list}\n\nEquip: fate title set <titleId>`), threadID, messageID);
        return;
      }
      if (titleSub === "set") {
        const tid = args.slice(2).join("_").toLowerCase();
        if (!tid || !FATE_TITLES.find(t => t.id === tid)) { await api.sendMessage(styled("Servant Titles", "⚠️", "Invalid title ID. Use fate title list."), threadID, messageID); return; }
        if (!(s.titles || []).includes(tid) && !isDev) { await api.sendMessage(styled("Servant Titles", "🛑", "You haven't unlocked this title yet!"), threadID, messageID); return; }
        s.activeTitle = tid;
        await saveServantData(db, senderID.toString(), s);
        await api.sendMessage(styled("Servant Titles", "✅", `Active title set to: ${FATE_TITLES.find(t => t.id === tid)?.label || tid}`), threadID, messageID);
        return;
      }
      await api.sendMessage(styled("Servant Titles", "⚠️", "Usage: fate title list | fate title set <titleId>"), threadID, messageID);
      return;
    }

    if (action === "inventory") {
      const weapons = Object.entries(s.inventory.weapons).map(([id, w]) => `  [${id}] ${w.name} Lv.${w.level} (Upgrade: ${s.weaponUpgrades[id] || 0}/10)`).join("\n") || "  None";
      const potions = Object.entries(s.inventory.potions).filter(([, qty]) => qty > 0).map(([id, qty]) => `  [${id}] ${POTION_ITEMS[id]?.name || id} ×${qty}`).join("\n") || "  None";
      await api.sendMessage(styled("Inventory", "🎒",
        `💎 Gems: ${s.gems.toLocaleString()}\n🪙 Gold: ${s.goldCoins.toLocaleString()}\n🏆 Grails: ${s.holyGrails}\n\n⚔️ WEAPONS:\n${weapons}\n\n🧪 POTIONS:\n${potions}`
      ), threadID, messageID);
      return;
    }

    if (action === "leaderboard") {
      const top = await db.db("fate_servants").find({ name: { $exists: true } }).sort({ holyGrails: -1, exp: -1 }).limit(10).toArray();
      const list = top.map((sv: any, i: number) => `${i + 1}. ${sv.name} [${sv.rarity || "?"}] — ${sv.holyGrails || 0} Grails | Lv.${sv.level || 1}`).join("\n");
      await api.sendMessage(styled("Leaderboard", "🏆", `TOP 10 SERVANTS\n\n${list || "No servants yet."}`), threadID, messageID);
      return;
    }

    if (action === "changename") {
      const newName = args.slice(1).join(" ").trim();
      if (!newName || newName.length < 2 || newName.length > 30) { await api.sendMessage(styled("Change Name", "⚠️", "Usage: fate changename <new name> (2–30 chars)"), threadID, messageID); return; }
      const oldName = s.name; s.name = newName;
      await saveServantData(db, senderID.toString(), s);
      await api.sendMessage(styled("Change Name", "✅", `Name changed: ${oldName} → ${newName}`), threadID, messageID);
      return;
    }

    if (action === "chaldea") {
      const chaldeaSub  = args[1]?.toLowerCase();
      const chaldeaName = args.slice(2).join(" ").trim();
      const col         = db.db("fate_chaldeas");
      if (chaldeaSub === "create") {
        if (!chaldeaName) { await api.sendMessage(styled("Chaldea", "⚠️", "Usage: fate chaldea create <n>"), threadID, messageID); return; }
        if (s.chaldea) { await api.sendMessage(styled("Chaldea", "🛑", `You are already in ${s.chaldea}.`), threadID, messageID); return; }
        if (await col.findOne({ name: chaldeaName })) { await api.sendMessage(styled("Chaldea", "❌", `"${chaldeaName}" already exists.`), threadID, messageID); return; }
        await col.insertOne({ name: chaldeaName, members: [senderID.toString()], totalPower: Math.floor(servantPower(s)) });
        s.chaldea = chaldeaName;
        const newTitles = checkAndGrantFateTitles(s);
        await saveServantData(db, senderID.toString(), s);
        await api.sendMessage(styled("Chaldea", "🏰", `Chaldea "${chaldeaName}" created!${titleLine(newTitles)}`), threadID, messageID);
        return;
      }
      if (chaldeaSub === "join") {
        if (!chaldeaName) { await api.sendMessage(styled("Chaldea", "⚠️", "Usage: fate chaldea join <n>"), threadID, messageID); return; }
        if (s.chaldea) { await api.sendMessage(styled("Chaldea", "🛑", `You are already in ${s.chaldea}.`), threadID, messageID); return; }
        const ch = await col.findOne({ name: chaldeaName });
        if (!ch) { await api.sendMessage(styled("Chaldea", "❌", `"${chaldeaName}" not found.`), threadID, messageID); return; }
        await col.updateOne({ name: chaldeaName }, { $push: { members: senderID.toString() } });
        s.chaldea = chaldeaName;
        await saveServantData(db, senderID.toString(), s);
        await api.sendMessage(styled("Chaldea", "✅", `Joined Chaldea "${chaldeaName}"!`), threadID, messageID);
        return;
      }
      if (chaldeaSub === "leave") {
        if (!s.chaldea) { await api.sendMessage(styled("Chaldea", "⚠️", "You are not in any Chaldea."), threadID, messageID); return; }
        const oldName = s.chaldea;
        await col.updateOne({ name: s.chaldea }, { $pull: { members: senderID.toString() } });
        s.chaldea = undefined;
        await saveServantData(db, senderID.toString(), s);
        await api.sendMessage(styled("Chaldea", "✅", `Left Chaldea "${oldName}".`), threadID, messageID);
        return;
      }
      if (chaldeaSub === "list") {
        const all = await col.find({}).sort({ totalPower: -1 }).limit(10).toArray();
        const list = all.map((c: any, i: number) => `${i + 1}. ${c.name} — ${c.members?.length || 0} members`).join("\n");
        await api.sendMessage(styled("Chaldea List", "🏰", `Top Chaldeas:\n\n${list || "No Chaldeas yet."}`), threadID, messageID);
        return;
      }
      if (chaldeaSub === "info") {
        const cn = chaldeaName || s.chaldea;
        if (!cn) { await api.sendMessage(styled("Chaldea", "⚠️", "Usage: fate chaldea info <n>"), threadID, messageID); return; }
        const ch = await col.findOne({ name: cn });
        if (!ch) { await api.sendMessage(styled("Chaldea", "❌", `"${cn}" not found.`), threadID, messageID); return; }
        await api.sendMessage(styled("Chaldea Info", "🏰", `${ch.name}\nMembers: ${ch.members?.length || 0}\nTotal Power: ${(ch.totalPower || 0).toLocaleString()}`), threadID, messageID);
        return;
      }
      await api.sendMessage(styled("Chaldea", "⚠️", "Usage: fate chaldea <create|join|leave|list|info> [name]"), threadID, messageID);
      return;
    }

    if (action === "grailwar") {
      const gwSub   = args[1]?.toLowerCase();
      const existing = activeGrailWars.get(threadID);
      const GW_DURATION = 30 * 60;
      const GW_MAX      = 13;

      if (gwSub === "start") {
        if (existing && existing.expiresAt > currentTime) {
          await api.sendMessage(styled("Holy Grail War", "⚠️", `A Grail War is already open! (${existing.participants.length}/${GW_MAX})\nReply 'enter grail war' to the original lobby message to join.`), threadID, messageID);
          return;
        }
        const war = { participants: [senderID.toString()], initiatorID: senderID.toString(), expiresAt: currentTime + GW_DURATION, round: 0 };
        activeGrailWars.set(threadID, war);

        await createReply(api, {
          threadID,
          messageID,
          message: styled("⚔️ HOLY GRAIL WAR ⚔️", "🏆",
            `${s.name} has initiated the Holy Grail War!\n\nUp to ${GW_MAX} Servants may enter.\nReply 'enter grail war' to THIS message within 30 minutes to join.\n\nAny registered Servant can join!\nInitiator: fate grailwar begin when ready.`
          ),
          keepAlive: true,
          authorID: null,
          onExpire: ({ api, threadID: tid }: any) => {
            activeGrailWars.delete(tid);
            api.sendMessage(styled("Holy Grail War", "⌛", "The Grail War lobby has expired."), tid);
          },
          callback: async ({ api, event, reply, end }: any) => {
            if (event.body?.toLowerCase().trim() !== "enter grail war") return;
            const gw = activeGrailWars.get(threadID);
            if (!gw || Math.floor(Date.now() / 1000) > gw.expiresAt) {
              await reply({ message: styled("Holy Grail War", "⚠️", "The entry window has closed.") });
              end(); activeGrailWars.delete(threadID); return;
            }
            if (gw.participants.includes(event.senderID.toString())) {
              await reply({ message: styled("Holy Grail War", "⚠️", "You've already entered!") });
              return;
            }
            if (gw.participants.length >= GW_MAX) {
              await reply({ message: styled("Holy Grail War", "🛑", `War is full (${GW_MAX}/${GW_MAX}).`) });
              end(); return;
            }
            const joiner = await db.db("fate_servants").findOne({ userID: event.senderID.toString() });
            if (!joiner?.name) {
              await reply({ message: styled("Holy Grail War", "⚠️", "You must register first. Use fate register <n>.") });
              return;
            }
            gw.participants.push(event.senderID.toString());
            activeGrailWars.set(threadID, gw);
            const remaining = gw.expiresAt - Math.floor(Date.now() / 1000);
            const mins = Math.floor(remaining / 60); const secs = remaining % 60;
            await api.sendMessage(styled("Holy Grail War", "✅",
              `${joiner.name} entered the war! (${gw.participants.length}/${GW_MAX})\n\nTime left: ${mins}m ${secs}s\nReply 'enter grail war' to join.\nInitiator: fate grailwar begin when ready.`
            ), event.threadID, event.messageID);
          },
        });
        return;
      }

      if (gwSub === "begin") {
        if (!existing) { await api.sendMessage(styled("Holy Grail War", "⚠️", "No Grail War open. Use fate grailwar start first."), threadID, messageID); return; }
        if (existing.initiatorID !== senderID.toString()) { await api.sendMessage(styled("Holy Grail War", "❌", "Only the initiator can begin the war."), threadID, messageID); return; }
        if (existing.participants.length < 2) { await api.sendMessage(styled("Holy Grail War", "⚠️", `Need at least 2 participants. Current: ${existing.participants.length}/${GW_MAX}.`), threadID, messageID); return; }
        const col = db.db("fate_servants");
        const entrants: { id: string; name: string; power: number }[] = [];
        for (const pid of existing.participants) {
          const pd = await col.findOne({ userID: pid });
          if (pd) entrants.push({ id: pid, name: pd.name || "Unknown", power: isDevUser(pid) ? 99000000000 : servantPower(pd as ServantData) * (0.85 + Math.random() * 0.30) });
        }
        entrants.sort((a, b) => b.power - a.power);
        const winner = entrants[0];
        const bracket = entrants.map((e, i) => `${i + 1}. ${e.name} — Power: ${e.power.toFixed(0)}`).join("\n");
        const winnerData = await col.findOne({ userID: winner.id });
        if (winnerData) {
          winnerData.holyGrails = (winnerData.holyGrails || 0) + 3;
          winnerData.exp        = (winnerData.exp || 0) + 50000;
          winnerData.gems       = (winnerData.gems || 0) + 20;
          winnerData.level      = calcLevel(winnerData.exp);
          winnerData.grailWarWins = (winnerData.grailWarWins || 0) + 1;
          const wTitles = checkAndGrantFateTitles(winnerData as ServantData);
          await saveServantData(db, winner.id, winnerData as ServantData);
        }
        for (const e of entrants.slice(1)) {
          const pd = await col.findOne({ userID: e.id });
          if (pd) { pd.exp = (pd.exp || 0) + 5000; pd.gems = (pd.gems || 0) + 2; await saveServantData(db, e.id, pd as ServantData); }
        }
        activeGrailWars.delete(threadID);
        await api.sendMessage(styled("⚔️ HOLY GRAIL WAR RESULT ⚔️", "🏆",
          `POWER RANKINGS:\n${bracket}\n\n🏆 WINNER: ${winner.name}!\n\n+3 Holy Grails | +50,000 EXP | +20 💎\nAll others: +5,000 EXP consolation.`
        ), threadID, messageID);
        return;
      }
      await api.sendMessage(styled("Holy Grail War", "⚠️", "fate grailwar start — open lobby (30 min, any servant can join)\nfate grailwar begin — start the tournament (initiator only)"), threadID, messageID);
      return;
    }

    if (action === "raid") {
      const raidSub  = args[1]?.toLowerCase();
      const existingR = activeRaidsFate.get(threadID);
      const RAID_DURATION = 30 * 60;
      const RAID_MAX = 5;

      if (raidSub === "start") {
        if (!existingR) { await api.sendMessage(styled("Fate Raid", "⚠️", "No raid open. Use fate raid to create one."), threadID, messageID); return; }
        if (existingR.initiatorID !== senderID.toString()) { await api.sendMessage(styled("Fate Raid", "❌", "Only the initiator can start."), threadID, messageID); return; }
        if (existingR.participants.length < 2) { await api.sendMessage(styled("Fate Raid", "⚠️", `Need at least 2 servants.`), threadID, messageID); return; }
        const raidBosses = [
          { name: "Beast of Alaya", power: 80000 }, { name: "Tiamat Fragment", power: 120000 },
          { name: "Goetia Remnant", power: 200000 }, { name: "Crypter Commander", power: 60000 },
        ];
        const rb = raidBosses[Math.floor(Math.random() * raidBosses.length)];
        const col = db.db("fate_servants");
        let partyPow = 0; const names: string[] = [];
        for (const pid of existingR.participants) {
          const pd = await col.findOne({ userID: pid });
          if (pd) { partyPow += isDevUser(pid) ? 99000000000 : servantPower(pd as ServantData); names.push(pd.name || "Servant"); }
        }
        const raidWin = partyPow * (0.85 + Math.random() * 0.30) > rb.power;
        for (const pid of existingR.participants) {
          const pd = await col.findOne({ userID: pid });
          if (pd) {
            pd.exp = (pd.exp || 0) + (raidWin ? 15000 : 2000);
            pd.goldCoins = (pd.goldCoins || 0) + (raidWin ? 5000 : 500);
            if (raidWin) pd.holyGrails = (pd.holyGrails || 0) + 1;
            pd.level = calcLevel(pd.exp);
            await saveServantData(db, pid, pd as ServantData);
          }
        }
        activeRaidsFate.delete(threadID);
        await api.sendMessage(styled("⚔️ RAID COMPLETE ⚔️", raidWin ? "🏆" : "💥",
          `Party: ${names.join(", ")}\nBoss: ${rb.name} (Power: ${rb.power.toLocaleString()})\nParty Power: ${partyPow.toFixed(0)}\n\n${raidWin ? "VICTORY! +15,000 EXP | +5,000 🪙 | +1 🏆 each!" : "DEFEAT! +2,000 EXP consolation."}`
        ), threadID, messageID);
        return;
      }

      if (existingR) {
        await api.sendMessage(styled("Fate Raid", "ℹ️", `Raid open: ${existingR.participants.length}/5. Reply 'join raid' to the original lobby message.`), threadID, messageID);
        return;
      }

      const newRaid = { initiatorID: senderID.toString(), participants: [senderID.toString()], expiresAt: currentTime + RAID_DURATION };
      activeRaidsFate.set(threadID, newRaid);

      await createReply(api, {
        threadID,
        messageID,
        message: styled("⚔️ RAID INITIATED ⚔️", "🏰",
          `${s.name} opened a Singularity Raid!\n\nUp to ${RAID_MAX} servants can join.\nReply 'join raid' to THIS message within 30 minutes.\n\nAny registered Servant can join!\nRewards (win): 15,000 EXP + 5,000 🪙 + 1 🏆 each.\nInitiator: fate raid start when ready.`
        ),
        keepAlive: true,
        authorID: null,
        onExpire: ({ api, threadID: tid }: any) => {
          activeRaidsFate.delete(tid);
          api.sendMessage(styled("Fate Raid", "⌛", "The raid lobby has expired."), tid);
        },
        callback: async ({ api, event, reply, end }: any) => {
          if (event.body?.toLowerCase().trim() !== "join raid") return;
          const r = activeRaidsFate.get(threadID);
          if (!r || Math.floor(Date.now() / 1000) > r.expiresAt) {
            await reply({ message: styled("Raid", "⚠️", "This raid lobby has expired.") });
            end(); activeRaidsFate.delete(threadID); return;
          }
          if (r.participants.includes(event.senderID.toString())) {
            await reply({ message: styled("Raid", "⚠️", "You've already joined!") });
            return;
          }
          if (r.participants.length >= RAID_MAX) {
            await reply({ message: styled("Raid", "🛑", `Raid is full (${RAID_MAX}/${RAID_MAX}).`) });
            end(); return;
          }
          const joiner = await db.db("fate_servants").findOne({ userID: event.senderID.toString() });
          if (!joiner?.name) {
            await reply({ message: styled("Raid", "⚠️", "You must register first. Use fate register <n>.") });
            return;
          }
          r.participants.push(event.senderID.toString());
          activeRaidsFate.set(threadID, r);
          const remaining = r.expiresAt - Math.floor(Date.now() / 1000);
          await api.sendMessage(styled("Raid", "✅",
            `${joiner.name} joined the raid! (${r.participants.length}/${RAID_MAX})\n\nTime left: ${Math.floor(remaining / 60)}m ${remaining % 60}s\nInitiator: fate raid start when ready.`
          ), event.threadID, event.messageID);
        },
      });
      return;
    }

    if (action === "surge") {
      const surgeSub = args[1]?.toLowerCase();
      if (surgeSub === "start") {
        const sid = senderID.toString();
        const isAuth = isDev || (global.config.admins?.map(String).includes(sid)) || (global.config.developers?.map(String).includes(sid)) || (global.config.vips?.map(String).includes(sid));
        if (!isAuth) { await api.sendMessage(styled("Grail Surge", "❌", "Only admins, developers, or VIPs can start a Grail Surge."), threadID, messageID); return; }
        const existing = activeSurgesFate.get(threadID);
        if (existing && existing.expiresAt > currentTime) { await api.sendMessage(styled("Grail Surge", "⚠️", "A Grail Surge is already active!"), threadID, messageID); return; }
        activeSurgesFate.set(threadID, { expiresAt: currentTime + 600, claimedBy: null });
        await api.sendMessage(styled("⚡ GRAIL SURGE ⚡", "🏆",
          `A Holy Grail has materialized!\n\nFirst registered Servant to use fate surge enter within 10 minutes claims:\n• 1 Holy Grail 🏆 | 10,000 EXP | 2,000 🪙 | 10 💎\n\nOnly ONE servant can claim this!`
        ), threadID, messageID);
        setTimeout(() => {
          const sg = activeSurgesFate.get(threadID);
          if (sg && !sg.claimedBy) { activeSurgesFate.delete(threadID); api.sendMessage(styled("Grail Surge", "🏆", "The Holy Grail faded before anyone could claim it."), threadID); }
        }, 600000);
        return;
      }
      if (surgeSub === "enter") {
        const surge = activeSurgesFate.get(threadID);
        if (!surge || surge.expiresAt < currentTime) { await api.sendMessage(styled("Grail Surge", "⚠️", "No active Grail Surge right now."), threadID, messageID); return; }
        if (surge.claimedBy) { await api.sendMessage(styled("Grail Surge", "🛑", "The Grail has already been claimed!"), threadID, messageID); return; }
        surge.claimedBy = senderID.toString();
        activeSurgesFate.set(threadID, surge);
        s.holyGrails++; s.exp += 10000; s.goldCoins += 2000; s.gems += 10; s.level = calcLevel(s.exp);
        const newTitles = checkAndGrantFateTitles(s);
        await saveServantData(db, senderID.toString(), s);
        await api.sendMessage(styled("⚡ GRAIL SURGE CLAIMED ⚡", "🏆",
          `${s.name} seized the Holy Grail!\n\n+1 🏆 | +10,000 EXP | +2,000 🪙 | +10 💎\nTotal Grails: ${s.holyGrails}${titleLine(newTitles)}`
        ), threadID, messageID);
        return;
      }
      await api.sendMessage(styled("Grail Surge", "⚠️", "Usage: fate surge enter\n(Admins: fate surge start)"), threadID, messageID);
      return;
    }

    if (action === "setstat") {
      const sid = senderID.toString();
      const isAuth = isDev || global.config.admins?.map(String).includes(sid) || global.config.developers?.map(String).includes(sid);
      if (!isAuth) { await api.sendMessage(styled("Admin", "❌", "Access denied."), threadID, messageID); return; }
      const tName = args[1]; const atkV = parseInt(args[2]); const defV = parseInt(args[3]); const manaV = parseInt(args[4]); const luckV = parseInt(args[5]);
      if (!tName || isNaN(atkV) || isNaN(defV) || isNaN(manaV) || isNaN(luckV)) { await api.sendMessage(styled("Admin", "⚠️", "Usage: fate setstat <name> <atk> <def> <mana> <luck>"), threadID, messageID); return; }
      const target = await db.db("fate_servants").findOne({ name: tName });
      if (!target) { await api.sendMessage(styled("Admin", "❌", `Servant "${tName}" not found.`), threadID, messageID); return; }
      target.stats = { atk: atkV, def: defV, mana: manaV, luck: luckV };
      await saveServantData(db, target.userID, target as ServantData);
      await api.sendMessage(styled("Admin", "✅", `Stats updated for ${tName}.`), threadID, messageID);
      return;
    }

    if (action === "givegrail") {
      const sid = senderID.toString();
      const isAuth = isDev || global.config.admins?.map(String).includes(sid) || global.config.developers?.map(String).includes(sid);
      if (!isAuth) { await api.sendMessage(styled("Admin", "❌", "Access denied."), threadID, messageID); return; }
      const tName = args[1]; const amt = parseInt(args[2]) || 1;
      const target = await db.db("fate_servants").findOne({ name: tName });
      if (!target) { await api.sendMessage(styled("Admin", "❌", `Servant "${tName}" not found.`), threadID, messageID); return; }
      target.holyGrails = (target.holyGrails || 0) + amt;
      await saveServantData(db, target.userID, target as ServantData);
      await api.sendMessage(styled("Admin", "✅", `Gave ${amt} Holy Grail(s) to ${tName}. Total: ${target.holyGrails}`), threadID, messageID);
      return;
    }

    if (action === "givegems") {
      const sid = senderID.toString();
      const isAuth = isDev || global.config.admins?.map(String).includes(sid) || global.config.developers?.map(String).includes(sid);
      if (!isAuth) { await api.sendMessage(styled("Admin", "❌", "Access denied."), threadID, messageID); return; }
      const tName = args[1]; const amt = parseInt(args[2]) || 1;
      const target = await db.db("fate_servants").findOne({ name: tName });
      if (!target) { await api.sendMessage(styled("Admin", "❌", `Servant "${tName}" not found.`), threadID, messageID); return; }
      target.gems = (target.gems || 0) + amt;
      await saveServantData(db, target.userID, target as ServantData);
      await api.sendMessage(styled("Admin", "✅", `Gave ${amt} Gems to ${tName}. Total: ${target.gems}`), threadID, messageID);
      return;
    }

    if (action === "ban") {
      const sid = senderID.toString();
      const isAuth = isDev || global.config.admins?.map(String).includes(sid) || global.config.developers?.map(String).includes(sid);
      if (!isAuth) { await api.sendMessage(styled("Admin", "❌", "Access denied."), threadID, messageID); return; }
      const tName = args.slice(1).join(" ").trim();
      const target = await db.db("fate_servants").findOne({ name: tName });
      if (!target) { await api.sendMessage(styled("Admin", "❌", `Servant "${tName}" not found.`), threadID, messageID); return; }
      target.disabled = true;
      await saveServantData(db, target.userID, target as ServantData);
      await api.sendMessage(styled("Admin", "✅", `${tName} has been banned from Fate commands.`), threadID, messageID);
      return;
    }

    if (action === "unban") {
      const sid = senderID.toString();
      const isAuth = isDev || global.config.admins?.map(String).includes(sid) || global.config.developers?.map(String).includes(sid);
      if (!isAuth) { await api.sendMessage(styled("Admin", "❌", "Access denied."), threadID, messageID); return; }
      const tName = args.slice(1).join(" ").trim();
      const target = await db.db("fate_servants").findOne({ name: tName });
      if (!target) { await api.sendMessage(styled("Admin", "❌", `Servant "${tName}" not found.`), threadID, messageID); return; }
      target.disabled = false;
      await saveServantData(db, target.userID, target as ServantData);
      await api.sendMessage(styled("Admin", "✅", `${tName} has been unbanned.`), threadID, messageID);
      return;
    }

    await api.sendMessage(styled("Fate/Grand Order Commands", "📖", `Here are all available commands:

🔰 GETTING STARTED
fate register <n> — Create your Servant account
fate status — View your full servant profile
fate changename <new name> — Change your servant name

✨ SUMMONING & CLASS
fate summon — Roll for a Servant card (costs 10 💎)
fate class <class> — Change your servant class (costs 2,000 🪙)
  Classes: Saber, Archer, Lancer, Rider, Caster, Assassin, Berserker, Ruler

⚔️ COMBAT
fate battle — Fight a random enemy (+50 ATK per win)
fate np — Unleash your Noble Phantasm (requires 100% NP charge)
fate duel <servantName> — Challenge another servant to a PvP duel
fate bond — Train bond with your servant (+2% all stats, 30min cooldown)

📖 PROGRESSION
fate singularity — Attempt the current Singularity chapter
fate quest — View and track active quests
fate daily — Claim daily reward + login streak bonus

🛍️ SHOP & ITEMS
fate shop — Browse all weapons and potions
fate buy <ID> <qty> — Buy a weapon or potion by ID
fate use <ID> <qty> — Use a potion from your inventory
fate upgrade <weaponID> — Upgrade a weapon (+10% stats per level, max 10)
fate inventory — View all owned items

⭐ SPECIAL SERVANT
fate buyenkidu — Obtain Enkidu [XXSR]
  Cost: 1,000,000,000,000 💎 + 1,000,000,000 🪙

⚡ SKILLS
fate skill list — View all unlockable skills
fate skill learn <ID> — Learn a skill [SK01–SK10]

🎖️ TITLES
fate title list — View all titles
fate title set <titleId> — Equip a title

🏰 CHALDEA (GUILDS)
fate chaldea create <n> — Found a new Chaldea
fate chaldea join <n> — Join a Chaldea
fate chaldea leave — Leave your current Chaldea
fate chaldea list — View all Chaldeas
fate chaldea info [name] — View Chaldea details

🏆 EVENTS & MULTIPLAYER
fate grailwar start — Open a Holy Grail War lobby (reply-based, up to 13, 30 min)
fate grailwar begin — Start the Grail War tournament (initiator only)
fate raid — Open a Singularity Raid lobby (up to 5 servants, 30 min)
fate raid start — Launch the raid battle (initiator only)
fate surge enter — Claim an active Grail Surge event

🏅 LEADERBOARD
fate leaderboard — Top 10 Servants by Holy Grails

🔐 ADMIN / DEVELOPER COMMANDS
fate setstat <n> <atk> <def> <mana> <luck> — Set a servant's stats
fate givegrail <n> <amount> — Give Holy Grails to a servant
fate givegems <n> <amount> — Give Gems to a servant
fate ban <n> — Ban a servant from using Fate commands
fate unban <n> — Unban a servant
fate surge start — Trigger a Grail Surge event in the chat`
    ), threadID, messageID);
  },
};

export default fateCommand;
