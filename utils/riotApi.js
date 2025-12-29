import axios from 'axios';
import logger from './logger.js';

const riotApiKey = process.env.RIOT_API_KEY;
if (!riotApiKey) logger.warn('RIOT_API_KEY is not set. Riot API requests may fail.');

const http = axios.create({ headers: { 'X-Riot-Token': riotApiKey } });
const PLATFORM_HOSTS = {
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

const REGION_GROUPS = {
  americas: ['na', 'br', 'lan', 'las', 'oce'],
  europe: ['euw', 'eun', 'tr', 'ru'],
  asia: ['kr', 'jp'],
};

const routingHost = region =>
  Object.entries(REGION_GROUPS).find(([, list]) => list.includes(region))?.[0] +
    '.api.riotgames.com' || 'americas.api.riotgames.com';

const platformHost = region => PLATFORM_HOSTS[region];

const encodeIdPart = str => encodeURIComponent(str.trim());

async function get(url, label = url) {
  try {
    const { data } = await http.get(url);
    return data;
  } catch (err) {
    const { response } = err;
    const statusLine = response ? `${response.status} ${response.statusText}` : err.message;
    logger.error(`Riot API ${label} failed → ${statusLine}`);
    if (response?.data) logger.debug(`↳ ${JSON.stringify(response.data)}`);
    throw err;
  }
}

export function getPUUIDByRiotID(gameName, tagLine) {
  const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeIdPart(
    gameName
  )}/${encodeIdPart(tagLine)}`;
  return get(url, 'getPUUIDByRiotID');
}

export function getSummonerByPUUID(puuid, region) {
  return get(
    `https://${platformHost(region)}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
    'getSummonerByPUUID'
  );
}

export function getMatchHistory(puuid, region, { queueType = 'all', count = 20 } = {}) {
  const qs = [`count=${count}`];
  if (queueType === 'ranked') qs.push('queue=420');
  return get(
    `https://${routingHost(region)}/lol/match/v5/matches/by-puuid/${puuid}/ids?${qs.join('&')}`,
    'getMatchHistory'
  );
}

export function getMatchDetails(matchId, region) {
  return get(`https://${routingHost(region)}/lol/match/v5/matches/${matchId}`, 'getMatchDetails');
}

export function getRankedStats(puuid, region) {
  return get(
    `https://${platformHost(region)}/lol/league/v4/entries/by-puuid/${puuid}`,
    'getRankedStatsByPUUID'
  );
}

export async function isApiKeyValid(testRegion = 'euw') {
  try {
    await get(
      `https://${testRegion}1.api.riotgames.com/lol/status/v4/platform-data`,
      'isApiKeyValid'
    );
    return true;
  } catch (err) {
    if (err.response?.status === 403) {
      logger.warn('Riot API key is invalid or expired.');
      return false;
    }
    return false;
  }
}
