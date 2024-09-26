// utils/riotApi.js
const axios = require('axios');
const logger = require('./logger');

const riotApiKey = process.env.RIOT_API_KEY;

const riotApi = axios.create({
  headers: { 'X-Riot-Token': riotApiKey },
});

// Mapping of region identifiers to API endpoints
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

// Mapping for regional routing values
const regionalEndpoints = {
  americas: ['na', 'br', 'lan', 'las', 'oce'],
  europe: ['euw', 'eun', 'tr', 'ru'],
  asia: ['kr', 'jp'],
};

// Function to get the regional endpoint
function getRegionalEndpoint(region) {
  for (const [key, regions] of Object.entries(regionalEndpoints)) {
    if (regions.includes(region)) {
      return `${key}.api.riotgames.com`;
    }
  }
  // Default to Americas if region not found
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
    logger.error(`API request failed: ${url} - ${error}`);
    throw error;
  }
}

/**
 * Get PUUID by Riot ID (gameName and tagLine)
 */
async function getPUUIDByRiotID(gameName, tagLine) {
  const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
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
  try {
    const matchIds = [];
    let start = 0;
    const count = 20; // Number of matches to fetch

    // Map region to routing value
    const routingRegion = getRoutingRegion(region);

    // Build the API URL
    let url = `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}&api_key=${process.env.RIOT_API_KEY}`;

    // Append queue filter if needed
    if (queueType === 'ranked') {
      // Queue ID 420 corresponds to Ranked Solo/Duo
      url += '&queue=420';
    }

    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    logger.error(`Error fetching match history: ${error}`);
    throw error;
  }
}

/**
 * Get match details by match ID.
 */
async function getMatchDetails(matchId, region) {
  const regionalHost = getRegionalEndpoint(region);
  const url = `https://${regionalHost}/lol/match/v5/matches/${matchId}`;
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
