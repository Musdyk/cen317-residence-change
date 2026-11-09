const config = require('./config');
const app = require('./app');

app.listen(config.port, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${config.port}`);
});
