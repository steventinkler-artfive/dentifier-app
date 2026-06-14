import { openDB } from 'idb';

const DB_NAME = 'dentifier-offline';
const STORE_NAME = 'outbox';
const DB_VERSION = 1;

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    },
  });
}

export async function addToOutbox({ method, entityName, data, id }) {
  const db = await getDB();
  const timestamp = Date.now();
  const key = `outbox:${timestamp}:${entityName}`;
  const record = {
    key,
    method,       // 'create' | 'update'
    entityName,
    data,
    id,           // only for updates
    timestamp,
    status: 'pending',
  };
  await db.put(STORE_NAME, record);
  return key;
}

export async function getAllFromOutbox() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function removeFromOutbox(key) {
  const db = await getDB();
  return db.delete(STORE_NAME, key);
}

export async function markOutboxItemFailed(key) {
  const db = await getDB();
  const item = await db.get(STORE_NAME, key);
  if (item) {
    await db.put(STORE_NAME, { ...item, status: 'failed' });
  }
}

export async function getOutboxCount() {
  const db = await getDB();
  return db.count(STORE_NAME);
}