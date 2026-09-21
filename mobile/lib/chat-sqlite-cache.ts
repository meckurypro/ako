import * as SQLite from "expo-sqlite";
import type { ConversationDetail, ConversationSummary, Message } from "@/features/messaging/api";

const DB_NAME = "ako-chat-cache.db";
const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS conversation_summaries (
  user_id TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  id TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, archived, id)
);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_updated ON conversation_summaries(user_id, archived, updated_at DESC);
CREATE TABLE IF NOT EXISTS conversation_details (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS messages (
  conversation_id TEXT NOT NULL,
  id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, id)
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at ASC);
`;

type PayloadRow = { payload: string };

let db: SQLite.SQLiteDatabase | null = null;

function database() {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
    db.execSync(SCHEMA);
  }
  return db;
}

function parseRows<T>(rows: PayloadRow[]) {
  return rows.flatMap(row => {
    try {
      return [JSON.parse(row.payload) as T];
    } catch {
      return [];
    }
  });
}

export function getCachedConversations(userId: string | undefined, archived: boolean) {
  if (!userId) return undefined;
  const rows = database().getAllSync<PayloadRow>(
    "SELECT payload FROM conversation_summaries WHERE user_id = ? AND archived = ? ORDER BY updated_at DESC",
    userId,
    archived ? 1 : 0,
  );
  const parsed = parseRows<ConversationSummary>(rows);
  return parsed.length ? parsed : undefined;
}

export function cacheConversations(userId: string | undefined, archived: boolean, rows: ConversationSummary[]) {
  if (!userId) return;
  const now = Date.now();
  const local = database();
  local.withTransactionSync(() => {
    local.runSync("DELETE FROM conversation_summaries WHERE user_id = ? AND archived = ?", userId, archived ? 1 : 0);
    for (const row of rows) {
      local.runSync(
        "INSERT OR REPLACE INTO conversation_summaries(user_id, archived, id, payload, updated_at) VALUES (?, ?, ?, ?, ?)",
        userId,
        archived ? 1 : 0,
        row.id,
        JSON.stringify(row),
        now,
      );
      if (row.other_participant?.id) {
        cacheProfilePayload(row.other_participant.id, row.other_participant);
      }
    }
  });
}

export function getCachedConversation(userId: string | undefined, id: string) {
  if (!userId || !id) return undefined;
  const row = database().getFirstSync<PayloadRow>("SELECT payload FROM conversation_details WHERE user_id = ? AND id = ?", userId, id);
  if (!row) return undefined;
  try {
    return JSON.parse(row.payload) as ConversationDetail;
  } catch {
    return undefined;
  }
}

export function cacheConversation(userId: string | undefined, detail: ConversationDetail) {
  if (!userId) return;
  database().runSync(
    "INSERT OR REPLACE INTO conversation_details(user_id, id, payload, updated_at) VALUES (?, ?, ?, ?)",
    userId,
    detail.id,
    JSON.stringify(detail),
    Date.now(),
  );
  if (detail.other_participant?.id) cacheProfilePayload(detail.other_participant.id, detail.other_participant);
}

export function getCachedMessages(conversationId: string) {
  if (!conversationId) return undefined;
  const rows = database().getAllSync<PayloadRow>("SELECT payload FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", conversationId);
  const parsed = parseRows<Message>(rows);
  return parsed.length ? parsed : undefined;
}

export function cacheMessages(conversationId: string, rows: Message[]) {
  if (!conversationId) return;
  const now = Date.now();
  const local = database();
  local.withTransactionSync(() => {
    local.runSync("DELETE FROM messages WHERE conversation_id = ?", conversationId);
    for (const row of rows) {
      local.runSync(
        "INSERT OR REPLACE INTO messages(conversation_id, id, created_at, payload, updated_at) VALUES (?, ?, ?, ?, ?)",
        conversationId,
        row.id,
        row.created_at,
        JSON.stringify(row),
        now,
      );
    }
  });
}

export function upsertCachedMessage(message: Message) {
  database().runSync(
    "INSERT OR REPLACE INTO messages(conversation_id, id, created_at, payload, updated_at) VALUES (?, ?, ?, ?, ?)",
    message.conversation_id,
    message.id,
    message.created_at,
    JSON.stringify(message),
    Date.now(),
  );
}

function cacheProfilePayload(id: string, payload: unknown) {
  const local = database();
  local.execSync("CREATE TABLE IF NOT EXISTS chat_profiles (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL)");
  local.runSync("INSERT OR REPLACE INTO chat_profiles(id, payload, updated_at) VALUES (?, ?, ?)", id, JSON.stringify(payload), Date.now());
}
