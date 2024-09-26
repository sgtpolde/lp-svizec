// utils/riotApi.js
const axios = require('axios');
const logger = require('./logger');

const riotApiKey = process.env.RIOT_API_KEY;

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

// Function to get the regional endpoint
function getRegionalEndpoint(region) {
  for (const [routing, regions] of Object.entries(routingEndpoints)) {
    if (regions.includes(region)) {
      return `${routing}.api.riotgames.com`;
    }
  }
  // Default to 'americas' if region not found
  return 'americas.api.riotgames.com';
}

/**
 * Helper function to handle API requests with error handling
 * @param {string} url - The URL to request
 * @returns {Promise<any>} - The response data
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
 */
async function getPUUIDByRiotID(gameName, tagLine) {
  const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    gameName
  )}/${encodeURIComponent(tagLine)}`;
  return await apiRequest(url);
}

/**
 * Get Summoner data by PUUID and region
 */
async function getSummonerByPUUID(puuid, region) {
  const platformHost = platformEndpoints[region];
  const url = `https://${platformHost}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  return await apiRequest(url);
}

/**
 * Get match history by PUUID.
 */
async function getMatchHistory(puuid, region, queueType = 'all') {
  const routingHost = getRegionalEndpoint(region);
  let url = `https://${routingHost}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=20`;

  // Append queue filter if needed
  if (queueType === 'ranked') {
    // Queue ID 420 corresponds to Ranked Solo/Duo
    url += '&queue=420';
  }

  return await apiRequest(url);
}

/**
 * Get match details by match ID.
 */
async function getMatchDetails(matchId, region) {
  const routingHost = getRegionalEndpoint(region);
  const url = `https://${routingHost}/lol/match/v5/matches/${matchId}`;
  return await apiRequest(url);
}

/**
 * Get ranked stats by Summoner ID.
 */
async function getRankedStats(summonerId, region) {
  const platformHost = platformEndpoints[region];
  const url = `https://${platformHost}/lol/league/v4/entries/by-summoner/${summonerId}`;
  return await apiRequest(url);
}

module.exports = {
  getPUUIDByRiotID,
  getSummonerByPUUID,
  getMatchHistory,
  getMatchDetails,
  getRankedStats,
};
