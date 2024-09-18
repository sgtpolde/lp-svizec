// utils/riotApi.js
const axios = require('axios');

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
 * Get PUUID by Riot ID (gameName and tagLine)
 * @param {string} gameName
 * @param {string} tagLine
 */
async function getPUUIDByRiotID(gameName, tagLine) {
  const response = await riotApi.get(
    `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );
  return response.data;
}

/**
 * Get Summoner data by PUUID and region
 * @param {string} puuid
 * @param {string} region
 */
async function getSummonerByPUUID(puuid, region) {
  const platformHost = platformEndpoints[region];
  const response = await riotApi.get(
    `https://${platformHost}/lol/summoner/v4/summoners/by-puuid/${puuid}`
  );
  return response.data;
}

/**
 * Get match history by PUUID.
 * @param {string} puuid
 * @param {string} region
 */
async function getMatchHistory(puuid, region) {
  const regionalHost = getRegionalEndpoint(region);
  const response = await riotApi.get(
    `https://${regionalHost}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
    { params: { count: 5 } }
  );
  return response.data;
}

/**
 * Get match details by match ID.
 * @param {string} matchId
 * @param {string} region
 */
async function getMatchDetails(matchId, region) {
  const regionalHost = getRegionalEndpoint(region);
  const response = await riotApi.get(`https://${regionalHost}/lol/match/v5/matches/${matchId}`);
  return response.data;
}

/**
 * Get ranked stats by Summoner ID.
 * @param {string} summonerId
 * @param {string} region
 */
async function getRankedStats(summonerId, region) {
  const platformHost = platformEndpoints[region];
  const response = await riotApi.get(
    `https://${platformHost}/lol/league/v4/entries/by-summoner/${summonerId}`
  );
  return response.data;
}

module.exports = {
  getPUUIDByRiotID,
  getSummonerByPUUID,
  getMatchHistory,
  getMatchDetails,
  getRankedStats,
};
