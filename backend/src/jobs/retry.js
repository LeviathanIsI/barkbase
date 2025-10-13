const RETRY_SCHEDULE = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getDelay(attempt) {
  if (!attempt || attempt < 1) {
    return RETRY_SCHEDULE[0];
  }

  const index = Math.min(attempt - 1, RETRY_SCHEDULE.length - 1);
  return RETRY_SCHEDULE[index];
}

module.exports = {
  RETRY_SCHEDULE,
  wait,
  getDelay,
};
