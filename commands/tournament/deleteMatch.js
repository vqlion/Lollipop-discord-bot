const { SlashCommandBuilder } = require("discord.js");
const { Match, Champion, Summoner, SummonerChampion } = require("../../models");
const { getMatchData } = require('./utils/helpers');

module.exports = {
    category: 'tournament',
    data: new SlashCommandBuilder()
        .setName("delete_match")
        .setDescription("Deletes a match from the tournament database")
        .addStringOption((option) =>
            option
                .setName("match_id")
                .setDescription("The Id of the match.")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const member = interaction.member;

        if (!member.roles.cache.find(role => role.name === 'Tournament admin')) {
            return interaction.editReply("You don't have the permission to use this command.");
        }

        const matchId = interaction.options.getString("match_id");

        const matchExists = await Match.findOne({ where: { matchId: matchId } });

        if (matchExists === null) {
            return interaction.editReply(`Match ${matchId} is not in the database.`);
        }

        const matchData = await getMatchData(matchId);
        if (matchData === null) {
            return interaction.editReply(`Match ${matchId} was not found. Please check the id.`);
        }
        const match = await Match.destroy({ where: { matchId: matchId } });

        const summonersData = matchData['info']['participants'];
        for (const summoner of summonersData) {
            const summonerChampionId = summoner['championId'].toString();

            // champion stats
            const championObject = await Champion.findOne({ where: { id: summonerChampionId } });
            if (championObject === null) {
                continue;
            }
            if (summoner['win']) {
                championObject.incrementWin(-1);
            } else {
                championObject.incrementLoss(-1);
            }
            
            // summoner stats
            const summonerId = summoner['summonerId'];
            const summonerObject = await Summoner.findOne({ where: { id: summonerId } });
            if (summonerObject === null) {
                continue;
            }
            if (summoner['win']) {
                summonerObject.incrementWin(-1);
            } else {
                summonerObject.incrementLoss(-1);
            }

            summonerObject.incrementKill(-1 * summoner['kills']);
            summonerObject.incrementDeath(-1 * summoner['deaths']);
            summonerObject.incrementAssist(-1 * summoner['assists']);

            // summoner <-> champion stats
            const summonerChampionObject = await SummonerChampion.findOne({
                where: {
                    summonerId: summonerId,
                    championId: summonerChampionId,
                }
            });

            if (summonerChampionObject === null) {
                continue;
            }

            if (summoner['win']) {
                summonerChampionObject.incrementWin(-1);
            } else {
                summonerChampionObject.incrementLoss(-1);
            }

            summonerChampionObject.incrementKill(-1 * summoner['kills']);
            summonerChampionObject.incrementDeath(-1 * summoner['deaths']);
            summonerChampionObject.incrementAssist(-1 * summoner['assists']);

            await summonerChampionObject.save();
            await championObject.save();
            await summonerObject.save();
        }

        return interaction.editReply(`Match ${matchId} succesfully deleted.`)
    }
};