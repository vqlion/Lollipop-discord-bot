const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require('axios').default;
const { getSummonerPuuid, getSummonerInfo } = require('./utils/helpers');
const { Summoner } = require("../../models");
const { Op } = require('sequelize');

module.exports = {
    category: 'tournament',
    data: new SlashCommandBuilder()
        .setName("player_stats")
        .setDescription("Returns the stats of a player")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("The player's summoner name")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("tag")
                .setDescription("The player's summoner tag")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const clientAvatar = interaction.client.user.avatarURL();
        const memberName = interaction.member.displayName;
        const memberAvatar = interaction.member.user.avatarURL();

        const summonerName = interaction.options.getString("name");
        const summonerTag = interaction.options.getString("tag");

        const summonerPuuid = await getSummonerPuuid(summonerName, summonerTag);

        if (!summonerPuuid) {
            return interaction.editReply("Couldn't find the player you're looking for. Please check the summoner's name and tag.");
        }

        const summonerInfo = await getSummonerInfo(summonerPuuid);

        const summonerObject = await Summoner.findOne({
            where: {
                id: summonerInfo.id,
                totalGames: {
                    [Op.gt]: 0,
                }
            }
        });

        if (!summonerObject) {
            return interaction.editReply("This player is not in the database yet.");
        }

        axios.get('https://ddragon.leagueoflegends.com/api/versions.json')
            .then((response) => {
                const version = response.data[0];

                const messageEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle(`${summonerObject.riotIdGameName}#${summonerTag}`)
                    .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${summonerInfo.profileIconId}.png`)
                    .setAuthor({ name: memberName, iconURL: memberAvatar })
                    .addFields(
                        { name: 'Winrate', value: `**${Math.round(summonerObject.winrate * 100) / 100}%** (${summonerObject.wins}W/${summonerObject.losses}L)` },
                        { name: 'Number of games', value: `**${summonerObject.totalGames}**` },
                        { name: 'KDA', value: `**${Math.round(summonerObject.kda * 100) / 100}** (${summonerObject.kills}/${summonerObject.deaths}/${summonerObject.assists})` },
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Lollipop', iconURL: clientAvatar });
                return interaction.editReply({ embeds: [messageEmbed] });
            })
            .catch((error) => { console.error });

    }
};