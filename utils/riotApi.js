// utils/riotApi.js
const axios = require('axios');
const logger = require('./logger');

const riotApiKey = process.env.RIOT_API_KEY;
if (!riotApiKey) {
  logger.warn('RIOT_API_KEY is not set. Riot API requests may fail.');
}

const riotApi = axios.create({
  headers: { 'X-Riot-Token': riotApiKey },
});

// Mapping of platform endpoints
const platformEndpoints = {
  na: 'na1.api.riotgames.com',
  euw: 'euw1.api.riotgames.com',
  eun: 'eun1.api.riotgames.com',
  kr: 'kr.api.riotgames.com',
  jp: 'jp1.api.riotgames.com',
  oce: 'oc1.api.riotgames.com',
  br: 'br1.api.riotgames.com',
  lan: 'la1.api.riotgames.com',
  las: 'la2.api.riotgames.com',
  ru: 'ru.api.riotgames.com',
  tr: 'tr1.api.riotgames.com',
};

// Mapping of regions to routing values
const routingEndpoints = {
  americas: ['na', 'br', 'lan', 'las', 'oce'],
  europe: ['euw', 'eun', 'tr', 'ru'],
  asia: ['kr', 'jp'],
};

/**
 * Determine the routing endpoint for a given region.
 * @param {string} region - The region code (e.g. "na", "euw").
 * @returns {string} The corresponding regional endpoint.
 */
function getRegionalEndpoint(region) {
  for (const [routing, regions] of Object.entries(routingEndpoints)) {
    if (regions.includes(region)) {
      return `${routing}.api.riotgames.com`;
    }
  }
  // Default to 'americas' if no match
  return 'americas.api.riotgames.com';
}

/**
 * Make a GET request to the Riot API and handle errors.
 * @param {string} url - The URL to request.
 * @returns {Promise<any>} The response data.
 * @throws Will throw an error if the request fails.
 */
async function apiRequest(url) {
  try {
    const response = await riotApi.get(url);
    return response.data;
  } catch (error) {
    if (error.response) {
      logger.error(
        `API request failed: ${url} - ${error.response.status} ${error.response.statusText}`
      );
      logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
    } else {
      logger.error(`API request failed: ${url} - ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get PUUID by Riot ID (gameName and tagLine)
 * @param {string} gameName
 * @param {string} tagLine
 * @returns {Promise<any>}
 */
async function getPUUIDByRiotID(gameName, tagLine) {
  const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    gameName
  )}/${encodeURIComponent(tagLine)}`;
  return apiRequest(url);
}

/**
 * Get Summoner data by PUUID and region
 * @param {string} puuid
 * @param {string} region
 * @returns {Promise<any>}
 */
async function getSummonerByPUUID(puuid, region) {
  const platformHost = platformEndpoints[region];
  const url = `https://${platformHost}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  return apiRequest(url);
}

/**
 * Get match history by PUUID.
 * @param {string} puuid
 * @param {string} region
 * @param {string} [queueType='all']
 * @returns {Promise<any[]>}
 */
async function getMatchHistory(puuid, region, queueType = 'all') {
  const routingHost = getRegionalEndpoint(region);
  let url = `https://${routingHost}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=20`;

  // Filter for ranked queue if needed
  if (queueType === 'ranked') {
    url += '&queue=420';
  }

  return apiRequest(url);
}

/**
 * Get match details by match ID.
 * @param {string} matchId
 * @param {string} region
 * @returns {Promise<any>}
 */
async function getMatchDetails(matchId, region) {
  const routingHost = getRegionalEndpoint(region);
  const url = `https://${routingHost}/lol/match/v5/matches/${matchId}`;
  return apiRequest(url);
}

/**
 * Get ranked stats by Summoner ID.
 * @param {string} summonerId
 * @param {string} region
 * @returns {Promise<any[]>}
 */
async function getRankedStats(summonerId, region) {
  const platformHost = platformEndpoints[region];
  const url = `https://${platformHost}/lol/league/v4/entries/by-summoner/${summonerId}`;
  return apiRequest(url);
}

/**
 * Check if the Riot API key is valid or expired by querying the LoL platform status.
 * A 200 response means the key is valid. A 403 means it's invalid or expired.
 * Other errors will be logged and considered inconclusive.
 *
 * @returns {Promise<boolean>} True if the API key is valid, false if invalid/expired.
 */
async function isApiKeyValid() {
  // You can adjust the region/platform as needed:
  const platform = 'euw1';
  const testUrl = `https://${platform}.api.riotgames.com/lol/status/v4/platform-data`;

  try {
    const response = await riotApi.get(testUrl);
    // If we get a 200 OK, the key is valid.
    if (response.status === 200) {
      return true;
    }
    // If somehow another 2xx is returned (unlikely), consider it valid as well.
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    if (error.response) {
      const { status } = error.response;
      if (status === 403) {
        // 403 means invalid or expired API key.
        logger.warn('Riot API key is invalid or expired.');
        return false;
      }
    }

    // Any other errors (e.g., 404, 500) will be logged.
    logger.error(`Unexpected error while checking API key: ${error.stack || error}`);
    // Consider returning `false` here if you want to treat any unexpected error as invalid key,
    // or `true` if you do not want to block functionality due to transient issues.
    return false;
  }
}

module.exports = {
  getPUUIDByRiotID,
  getSummonerByPUUID,
  getMatchHistory,
  getMatchDetails,
  getRankedStats,
  isApiKeyValid,
};
