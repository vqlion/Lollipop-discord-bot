const axios = require('axios').default;
const _ = require("lodash");

const { riot_api_key } = require('../../../config.json')

module.exports = {
    getMatchData,
    getSummonerPuuid,
    getSummonerInfo,
    getChampionKeyAndId,
    getChampionNameFromId,
    getLeagueVersion,
}

async function getMatchData(matchId) {
    const url = `https://europe.api.riotgames.com/lol/match/v5/matches/EUW1_${matchId}?api_key=${riot_api_key}`
    try {
        const response = await axios.get(url);
        if (response.status === 200) return response.data;
        return null;
    } catch (error) {
        return null;
    }
}

async function getSummonerPuuid(name, tag) {
    const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}?api_key=${riot_api_key}`
    try {
        const response = await axios.get(url);
        if (response.status === 200) return response.data.puuid;
        return null;
    } catch (error) {
        return null;
    }
}

async function getSummonerInfo(puuid) {
    const url = `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${riot_api_key}`
    try {
        const response = await axios.get(url);
        if (response.status === 200) return response.data;
        return null;
    } catch (error) {
        return null;
    }
}

async function getChampionKeyAndId(championName, version) {
    championName = _.camelCase(championName).toLowerCase();
    const champions = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
    const championData = Object.values(champions.data.data).find((c) => _.camelCase(c.name).toLowerCase() === championName);
    if (!championData) return [null, null];
    return [championData.key, championData.id];
}

async function getChampionNameFromId(championId, version) {
    const champions = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
    const championData = Object.values(champions.data.data).find((c) => c.key === championId);
    if (!championData) return null;
    return championData.name;
}

async function getLeagueVersion() {
    try {
        const versionRes = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
        if (versionRes.status === 200) return versionRes.data[0];
        return null;
    } catch (error) {
        return null;
    }


}