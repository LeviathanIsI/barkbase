let recoveryMode = false;

const setRecoveryMode = (value = false) => {
  recoveryMode = Boolean(value);
};

const isRecoveryMode = () => recoveryMode;

module.exports = {
  setRecoveryMode,
  isRecoveryMode,
};
