// utils/ddragon.js
// ----------------------------------------------------------------
import axios from 'axios';
import logger from './logger.js';

const childLogger = logger.child({ label: 'utils/ddragon' });

let cachedVersion = 'latest';

async function fetchLatestVersion() {
  try {
    const { data } = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json', {
      timeout: 5_000,
    });
    if (Array.isArray(data) && data.length && typeof data[0] === 'string') {
      cachedVersion = data[0];
      childLogger.info(`Using Data Dragon version ${cachedVersion}`);
    }
  } catch (err) {
    childLogger.warn(`Failed to fetch Data Dragon version – using "latest" (${err.message})`);
  }
}
fetchLatestVersion();

export function getDDragonVersion() {
  return cachedVersion || 'latest';
}
