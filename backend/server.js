const { createApp } = require('./src/router');

const PORT = process.env.PORT || 4000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Unified backend running at http://localhost:${PORT}`);
});

