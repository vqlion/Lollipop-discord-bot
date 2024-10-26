const axios = require('axios').default;

const { riot_api_key } = require('../../../config.json')

module.exports = {
    getMatchData
}

async function getMatchData(matchId) {
    const url = `https://europe.api.riotgames.com/lol/match/v5/matches/EUW1_${matchId}?api_key=${riot_api_key}`
    try {
        const response = await axios.get(url);
        if (response.status === 200) return response.data;
    } catch (error) {
        return null;
    }
}