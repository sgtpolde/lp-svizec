// utils/ddragon.js
// ----------------------------------------------------------------
const axios = require('axios');
const logger = require('./logger').child({ label: 'utils/ddragon' });

let cachedVersion = 'latest';

async function fetchLatestVersion() {
  try {
    const { data } = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json', {
      timeout: 5_000,
    });
    if (Array.isArray(data) && data.length && typeof data[0] === 'string') {
      cachedVersion = data[0];
      logger.info(`Using Data Dragon version ${cachedVersion}`);
    }
  } catch (err) {
    logger.warn(`Failed to fetch Data Dragon version – using \"latest\" (${err.message})`);
  }
}
fetchLatestVersion();

function getDDragonVersion() {
  return cachedVersion || 'latest';
}

module.exports = { getDDragonVersion };
