const { SlashCommandBuilder } = require("discord.js");
const { Match, Champion, Summoner } = require("../../models");
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
            const championExists = await Champion.findOne({ where: { championId: summonerChampionId } });
            if (championExists === null) {
                await Champion.create({ championId: summonerChampionId, name: summoner['championName'] });
            }
            const championObject = await Champion.findOne({ where: { championId: summonerChampionId } });
            if (summoner['win']) {
                championObject.incrementWin(1);
            } else {
                championObject.incrementLoss(1);
            }

            await championObject.save();

            // summoner stats
            const summonerId = summoner['summonerId'];
            const summonerExists = await Summoner.findOne({ where: { summonerId: summonerId } });
            if (summonerExists === null) {
                await Summoner.create({ summonerId: summonerId, riotIdGameName: summoner['riotIdGameName'] });
            }
            const summonerObject = await Summoner.findOne({ where: { summonerId: summonerId } });
            if (summoner['win']) {
                summonerObject.incrementWin(1);
            } else {
                summonerObject.incrementLoss(1);
            }

            summonerObject.incrementKill(summoner['kills']);
            summonerObject.incrementDeath(summoner['deaths']);
            summonerObject.incrementAssist(summoner['assists']);

            await summonerObject.save();
        }

        return interaction.editReply(`Match ${matchId} succesfully saved.`)

    }
};