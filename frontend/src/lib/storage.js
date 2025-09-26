const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const getStorage = () => {
  if (typeof window === 'undefined') {
    return noopStorage;
  }
  return window.localStorage;
};

export default getStorage;
