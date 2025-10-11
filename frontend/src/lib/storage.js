const createMemoryStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
};

const memoryStorage = createMemoryStorage();

// Check if localStorage is available
const isLocalStorageAvailable = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const getStorage = () => {
  // Use localStorage if available (browser environment)
  // Fall back to memory storage for SSR or when localStorage is unavailable
  if (isLocalStorageAvailable()) {
    return window.localStorage;
  }
  return memoryStorage;
};

export default getStorage;

