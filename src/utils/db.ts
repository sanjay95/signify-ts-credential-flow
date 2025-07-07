// db.ts
import { openDB } from "idb";

const DB_NAME = "signify-ts-db";
const STORE_NAME = "signify-store";

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

export const setItem = async <T>(key: string, value: T): Promise<void> => {
  const db = await initDB();
  await db.put(STORE_NAME, value, key);
};

export const getItem = async <T>(key: string): Promise<T | undefined> => {
  const db = await initDB();
  return await db.get(STORE_NAME, key);
};
