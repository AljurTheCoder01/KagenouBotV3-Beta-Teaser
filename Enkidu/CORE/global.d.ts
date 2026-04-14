export type EnkiduRole = 0 | 1 | 2 | 3 | 4;

export interface EnkiduCommandConfig {
  name: string;
  version: string;
  cooldown: number;
  description: string;
  author: string;
  nonPrefix: boolean;
  role: EnkiduRole;
  aliases?: string[];
  nsfw?: boolean;
}

export interface EnkiduRunContext {
  api: any;
  event: EnkiduEvent;
  args: string[];
  attachments: any[];
  prefix: string;
  db: EnkiduDB | null;
  commands: Map<string, EnkiduBot.Command>;
  usersData: Map<string, any>;
  globalData: Map<string, any>;
  admins: string[];
}

export interface EnkiduReplyContext {
  api: any;
  event: EnkiduEvent;
  attachments: any[];
  data: Record<string, any>;
}

export interface EnkiduReactionContext {
  api: any;
  event: EnkiduEvent;
  reaction: string;
  threadID: string;
  messageID: string;
  senderID: string;
}

export interface EnkiduEvent {
  type: string;
  threadID: string;
  senderID: string;
  messageID: string;
  body?: string;
  attachments?: any[];
  messageReply?: {
    messageID: string;
    body?: string;
    attachments?: any[];
    senderID?: string;
  };
  reaction?: string;
  logMessageType?: string;
  logMessageData?: any;
  [key: string]: any;
}

export interface EnkiduDB {
  db(collectionName: string): any;
}

export interface EnkiduReplyEntry {
  callback: (ctx: EnkiduReplyContext) => Promise<void> | void;
  author?: string;
  data?: Record<string, any>;
  keep?: boolean;
}

export interface EnkiduReactionEntry {
  callback: (ctx: EnkiduReactionContext) => Promise<void> | void;
  authorID?: string;
  threadID: string;
}

export interface EnkiduConfig {
  admins: string[];
  moderators: string[];
  developers: string[];
  vips: string[];
  Prefix: string[];
  botName: string;
  mongoUri: string | null;
  EnkiduPrefix: string;
  [key: string]: any;
}

declare global {
  namespace EnkiduBot {
    interface Command {
      config: EnkiduCommandConfig;
      run(ctx: EnkiduRunContext): Promise<void> | void;
      handleReply?(ctx: EnkiduReplyContext): Promise<void> | void;
      handleReaction?(ctx: EnkiduReactionContext): Promise<void> | void;
    }
  }

  var db: EnkiduDB | null;
  var config: EnkiduConfig;
  var botApi: any;
  var maintenanceMode: boolean;
  var profanityFilter: any;
  var profanityEnabled: boolean;

  var commands: Map<string, EnkiduBot.Command>;
  var nonPrefixCommands: Map<string, EnkiduBot.Command>;

  var usersData: Map<string, any>;
  var globalData: Map<string, any>;
  var userCooldowns: Map<string, number>;
  var usageTracker: Map<string, number>;
  var nsfwEnabled: Map<string, boolean>;
  var disabledCommands: Map<string, string[]>;
  var reactionData: Map<string, EnkiduReactionEntry>;
  var threadConfigs: Map<string, { prefix?: string; [key: string]: any }>;
  var replyListeners: Map<string, EnkiduReplyEntry>;

  var log: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    success(msg: string): void;
    event(msg: string): void;
  };

  function getPrefix(threadID: string): string;
  function setPrefix(threadID: string, prefix: string): void;
  function getUserRole(uid: string): EnkiduRole;
  function trackUsage(commandName: string): void;
  function getUsageStats(): [string, number][];
  function getXP(userID: string): Promise<number>;
  function addXP(userID: string, amount: number): Promise<number>;
  function getLevel(userID: string): Promise<number>;
  function reloadCommands(): void;
}

export const REPLY_TIMEOUT: number;

export {};
