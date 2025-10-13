let dbHealthy = false;
let appReady = false;

function setDbHealthy(value) {
  dbHealthy = Boolean(value);
}

function isDbHealthy() {
  return dbHealthy;
}

function setAppReady(value) {
  appReady = Boolean(value);
}

function isAppReady() {
  return appReady && dbHealthy;
}

module.exports = {
  setDbHealthy,
  isDbHealthy,
  setAppReady,
  isAppReady,
};
