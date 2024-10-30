const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require('axios').default;
const { getChampionKeyAndId, getLeagueVersion } = require('./utils/helpers');
const { Champion, SummonerChampion, Summoner } = require("../../models");
const { Op } = require('sequelize');

const NUMBER_TOP_SUMMONERS = 3;
const emojis = ['🥇', '🥈', '🥉']

module.exports = {
    category: 'tournament',
    data: new SlashCommandBuilder()
        .setName("champion_stats")
        .setDescription("Returns the stats of a champion")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("The champion's name")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const clientAvatar = interaction.client.user.avatarURL();
        const memberName = interaction.member.displayName;
        const memberAvatar = interaction.member.avatarURL() ?? interaction.member.user.avatarURL();

        const championName = interaction.options.getString("name");
        const leagueVersion = await getLeagueVersion();
        const [championId, championInternalName] = await getChampionKeyAndId(championName, leagueVersion);
        if (!championId) {
            return interaction.editReply("Couldn't find the champion you're looking for.")
        }

        const championObject = await Champion.findOne({
            where: {
                id: championId,
                totalGames: {
                    [Op.gt]: 0,
                }
            }
        })

        if (championObject === null) {
            return interaction.editReply(`${championName} is not in the database yet.`)
        }

        const bestSummoners = await SummonerChampion.findAll({
            where: {
                championId: championId,
                totalGames: {
                    [Op.gt]: 0
                }
            },
            order: [
                ['totalGames', 'DESC'],
                ['winrate', 'DESC'],
                ['kda', 'DESC'],
            ],
            include: Summoner,
            limit: NUMBER_TOP_SUMMONERS,
        })

        let mostPlayedValue = ''

        for (const summonerIndex in bestSummoners) {
            const summonerChampionObject = bestSummoners[summonerIndex];
            const emoji = emojis[summonerIndex];
            mostPlayedValue += `${emoji} **${summonerChampionObject.Summoner.riotIdGameName}**: ${Math.round(summonerChampionObject.winrate * 100) / 100}% WR - ${summonerChampionObject.wins}W/${summonerChampionObject.losses}L - ${Math.round(summonerChampionObject.kda * 100) / 100} KDA\n`
        }

        const messageEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`${championObject.name}`)
            .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/${leagueVersion}/img/champion/${championInternalName}.png`)
            .setAuthor({ name: memberName, iconURL: memberAvatar })
            .addFields(
                { name: 'Winrate', value: `**${Math.round(championObject.winrate * 100) / 100}%** (${championObject.wins}W/${championObject.losses}L)` },
                { name: 'Most played', value: mostPlayedValue},
            )
            .setTimestamp()
            .setFooter({ text: 'Lollipop', iconURL: clientAvatar });
        return interaction.editReply({ embeds: [messageEmbed] });

    }
};