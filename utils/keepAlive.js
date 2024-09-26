// KeepAlive.js
const express = require('express'); // This line requires the 'express' module
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Server is ready on port ' + listener.address().port);
});
