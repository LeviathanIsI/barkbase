import { openDB } from 'idb';
import { apiClient } from '@/lib/apiClient';

const DATABASE_NAME = 'barkbase-offline';
const STORE_NAME = 'pending-requests';

const dbPromise = openDB(DATABASE_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    }
  },
});

export const enqueueRequest = async (request) => {
  const db = await dbPromise;
  await db.add(STORE_NAME, {
    ...request,
    createdAt: new Date().toISOString(),
  });
};

export const flushQueue = async () => {
  const db = await dbPromise;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.store;
  const requests = await store.getAll();

  for (const item of requests) {
    try {
      await apiClient(item.url, {
        method: item.method,
        body: item.body,
        headers: item.headers,
      });
      await store.delete(item.id);
    } catch (error) {
      // stop processing to retry later
      console.error('Failed to flush request', error);
      break;
    }
  }

  await tx.done;
};
