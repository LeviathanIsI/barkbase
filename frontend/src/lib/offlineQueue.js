// This file is part of the old backend's offline queue system.
// Since we are moving to a serverless architecture where the client has a more direct
// connection to the backend services, this specific implementation is no longer applicable.
// A new offline strategy would need to be designed if required.

export const enqueueRequest = async (request) => {
  console.warn('Offline queue is disabled.');
  return Promise.resolve();
};

export const processQueue = async () => {
  console.warn('Offline queue is disabled.');
  return Promise.resolve();
};

export const flushQueue = async () => {
  console.warn('Offline queue is disabled.');
  return Promise.resolve();
};
