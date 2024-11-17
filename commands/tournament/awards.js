const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Summoner, Match, Champion, SummonerChampion } = require("../../models");
const { Op } = require('sequelize');

const MINIMUM_NUMBER_OF_GAMES = 5;
const AWARDS_LENGTH = 3;

module.exports = {
    category: 'tournament',
    data: new SlashCommandBuilder()
        .setName("awards")
        .setDescription("Shows the tournament awards hall of fame."),
    async execute(interaction) {
        await interaction.deferReply();
        const clientAvatar = interaction.client.user.avatarURL();
        const memberName = interaction.member.displayName;
        const memberAvatar = interaction.member.user.avatarURL();

        const totalMatches = await Match.count();

        const summoners = await Summoner.findAll({
            where: {
                totalGames: {
                    [Op.gte]: MINIMUM_NUMBER_OF_GAMES
                }
            },
            include: Champion,
            order: [
                [Champion, SummonerChampion, 'totalGames', 'DESC'], // order by totalGames on the joint table, helpful for OTP
                [Champion, SummonerChampion, 'winrate', 'DESC'] // and by winrate if there is a tie
            ]
        });

        const topKillPlayers = summoners.toSorted((a, b) => b.kills - a.kills).slice(0, AWARDS_LENGTH);
        let mostKillsValue = '';
        for(const summonerObject of topKillPlayers) {
            mostKillsValue += `${summonerObject.riotIdGameName} - ${summonerObject.kills}\n`
        }

        const topDeathPlayers = summoners.toSorted((a, b) => b.deaths - a.deaths).slice(0, AWARDS_LENGTH);
        let mostDeathsValue = '';
        for(const summonerObject of topDeathPlayers) {
            mostDeathsValue += `${summonerObject.riotIdGameName} - ${summonerObject.deaths}\n`
        }

        const topAssistPlayers = summoners.toSorted((a, b) => b.assists - a.assists).slice(0, AWARDS_LENGTH);
        let mostAssistsValue = '';
        for(const summonerObject of topAssistPlayers) {
            mostAssistsValue += `${summonerObject.riotIdGameName} - ${summonerObject.assists}\n`
        }

        const topKDAPlayers = summoners.toSorted((a, b) => b.kda - a.kda).slice(0, AWARDS_LENGTH);
        let bestKDAValue = '';
        for(const summonerObject of topKDAPlayers) {
            bestKDAValue += `${summonerObject.riotIdGameName} - ${Math.round(summonerObject.kda * 100) / 100}\n` // I hate javascript
        }

        const topKillPerGamePlayers = summoners.toSorted((a, b) => (b.kills / b.totalGames) - (a.kills / a.totalGames)).slice(0, AWARDS_LENGTH);
        let mostKillsPerGameValue = '';
        for(const summonerObject of topKillPerGamePlayers) {
            mostKillsPerGameValue += `${summonerObject.riotIdGameName} - ${Math.round(100 * summonerObject.kills/summonerObject.totalGames) / 100}\n`
        }

        const topDeathPerGamePlayers = summoners.toSorted((a, b) => (b.deaths / b.totalGames) - (a.deaths / a.totalGames)).slice(0, AWARDS_LENGTH);
        let mostDeathsPerGameValue = '';
        for(const summonerObject of topDeathPerGamePlayers) {
            mostDeathsPerGameValue += `${summonerObject.riotIdGameName} - ${Math.round(100 * summonerObject.deaths/summonerObject.totalGames) / 100}\n`
        }

        const topAssistPerGamePlayers = summoners.toSorted((a, b) => (b.assists / b.totalGames) - (a.assists / a.totalGames)).slice(0, AWARDS_LENGTH);
        let mostAssistsPerGameValue = '';
        for(const summonerObject of topAssistPerGamePlayers) {
            mostAssistsPerGameValue += `${summonerObject.riotIdGameName} - ${Math.round(100 * summonerObject.assists/summonerObject.totalGames) / 100}\n`
        }

        const topChampionPoolPlayers = summoners
            .toSorted((a, b) => (b.Champions.length/b.totalGames) - (a.Champions.length/a.totalGames) || b.totalGames - a.totalGames) 
            .slice(0, AWARDS_LENGTH) // sort by number of champions/totalGames, then by totalGames if there is a tie
        let biggestChampionPoolValue = '';
        for(const summonerObject of topChampionPoolPlayers) {
            biggestChampionPoolValue += `${summonerObject.riotIdGameName} - ${summonerObject.Champions.length} champions played (${summonerObject.totalGames} games)\n`
        }
        
        const topOTPPerGamePlayers = summoners
            .toSorted((a, b) => (b.Champions[0].SummonerChampion.totalGames/b.totalGames) - (a.Champions[0].SummonerChampion.totalGames/a.totalGames) || b.totalGames - a.totalGames)
            .slice(0, AWARDS_LENGTH) // same idea as above
        let biggestOTPValue = '';
        for(const summonerObject of topOTPPerGamePlayers) {
            biggestOTPValue += `${summonerObject.riotIdGameName} - ${summonerObject.Champions[0].name}: ${summonerObject.Champions[0].SummonerChampion.totalGames} games (${Math.round(100 * summonerObject.Champions[0].SummonerChampion.totalGames/summonerObject.totalGames)}% of total)\n`
        }
        
        const messageEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`🏆 Awards 🏆`)
            .setAuthor({ name: memberName, iconURL: memberAvatar })
            .addFields(
                { name: '📈 Best KDA', value: bestKDAValue },
                { name: '⚔️ Most kills', value: mostKillsValue },
                { name: '💀 Most deaths', value: mostDeathsValue },
                { name: '🤝 Most assists', value: mostAssistsValue },
                { name: '⚔️ Most kills per game', value: mostKillsPerGameValue },
                { name: '💀 Most deaths per game', value: mostDeathsPerGameValue },
                { name: '🤝 Most assists per game', value: mostAssistsPerGameValue },
                { name: '🐔 Biggest champion pool', value: biggestChampionPoolValue },
                { name: '🐴 Biggest OTP', value: biggestOTPValue },
            )
            .setTimestamp()
            .setFooter({ text: 'Lollipop' + ` - ${totalMatches} games saved`, iconURL: clientAvatar });

        return interaction.editReply({ embeds: [messageEmbed] });
    }
};