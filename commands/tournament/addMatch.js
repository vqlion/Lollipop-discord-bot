const { SlashCommandBuilder } = require("discord.js");
const { Match, Champion, Summoner, SummonerChampion } = require("../../models");
const { getMatchData } = require('./utils/helpers');

module.exports = {
    category: 'tournament',
    data: new SlashCommandBuilder()
        .setName("add_match")
        .setDescription("Adds a match to the tournament database")
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

        if (matchExists instanceof Match) {
            return interaction.editReply(`Match ${matchId} is already in the database.`);
        }

        const matchData = await getMatchData(matchId);
        if (matchData === null) {
            return interaction.editReply(`Match ${matchId} was not found. Please check the id.`);
        }
        const match = await Match.create({ matchId: matchId });

        const summonersData = matchData['info']['participants'];
        for (const summoner of summonersData) {
            const summonerChampionId = summoner['championId'].toString();

            // champion stats
            let championObject = await Champion.findOne({ where: { id: summonerChampionId } });
            if (championObject === null) {
                championObject = await Champion.create({ id: summonerChampionId, name: summoner['championName'] });
            }
            if (summoner['win']) {
                championObject.incrementWin(1);
            } else {
                championObject.incrementLoss(1);
            }

            // summoner stats
            const summonerId = summoner['summonerId'];
            let summonerObject = await Summoner.findOne({ where: { id: summonerId }, include: Champion });
            if (summonerObject === null) {
                summonerObject = await Summoner.create({ id: summonerId, riotIdGameName: summoner['riotIdGameName'] });
            }
            if (summoner['win']) {
                summonerObject.incrementWin(1);
            } else {
                summonerObject.incrementLoss(1);
            }

            summonerObject.incrementKill(summoner['kills']);
            summonerObject.incrementDeath(summoner['deaths']);
            summonerObject.incrementAssist(summoner['assists']);
            summonerObject.riotIdGameName = summoner['riotIdGameName'];

            // summoner <-> champion stats
            let summonerChampionObject = await SummonerChampion.findOne({
                where: {
                    summonerId: summonerId,
                    championId: summonerChampionId,
                }
            });

            if (summonerChampionObject === null) {
                summonerChampionObject = await SummonerChampion.create({ SummonerId: summonerId, ChampionId: summonerChampionId });
            }

            if (summoner['win']) {
                summonerChampionObject.incrementWin(1);
            } else {
                summonerChampionObject.incrementLoss(1);
            }

            summonerChampionObject.incrementKill(summoner['kills']);
            summonerChampionObject.incrementDeath(summoner['deaths']);
            summonerChampionObject.incrementAssist(summoner['assists']);

            await summonerChampionObject.save();
            await championObject.save();
            await summonerObject.save();
        }

        return interaction.editReply(`Match ${matchId} succesfully saved.`)

    }
};