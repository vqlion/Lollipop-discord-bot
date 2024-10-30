const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require('axios').default;
const { getSummonerPuuid, getSummonerInfo, getChampionNameFromId } = require('./utils/helpers');
const { Summoner, SummonerChampion } = require("../../models");
const { Op } = require('sequelize');

const NUMBER_TOP_CHAMPIONS = 3;
const emojis = ['🥇', '🥈', '🥉']

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
        const memberAvatar = interaction.member.avatarURL() ?? interaction.member.user.avatarURL();

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

        const summonerTopChampions = await SummonerChampion.findAll({
            where: {
                summonerId: summonerInfo.id,
                totalGames: {
                    [Op.gt]: 0
                }
            },
            order: [
                ['totalGames', 'DESC'],
                ['winrate', 'DESC'],
                ['kda', 'DESC'],
            ],
            limit: NUMBER_TOP_CHAMPIONS,
        })

        const winrateValue = `**${Math.round(summonerObject.winrate * 100) / 100}%**`

        axios.get('https://ddragon.leagueoflegends.com/api/versions.json')
            .then(async (response) => {
                const version = response.data[0];

                const messageEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle(`${summonerObject.riotIdGameName}#${summonerTag}`)
                    .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${summonerInfo.profileIconId}.png`)
                    .setAuthor({ name: memberName, iconURL: memberAvatar })
                    .addFields(
                        { name: 'Winrate', value: winrateValue + ` (${summonerObject.wins}W/${summonerObject.losses}L - ${summonerObject.totalGames} games)` },
                        { name: 'KDA', value: `**${Math.round(summonerObject.kda * 100) / 100}** (${summonerObject.kills}/${summonerObject.deaths}/${summonerObject.assists})` },
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Lollipop', iconURL: clientAvatar });

                for (const championIndex in summonerTopChampions) {
                    const championObject = summonerTopChampions[championIndex];
                    const emoji = emojis[championIndex];
                    const championName = await getChampionNameFromId(championObject.ChampionId, version); // some champions have weird name :(
                    if (!championName) continue;
                    messageEmbed.addFields({
                        name: `${emoji} ${championName}`,
                        value: `**${Math.round(championObject.winrate * 100) / 100}% WR** - ${championObject.wins}W/${championObject.losses}L \n**${Math.round(championObject.kda * 100) / 100} KDA** - ${championObject.kills}/${championObject.deaths}/${championObject.assists}`,
                        inline: true,
                    })
                }
                return interaction.editReply({ embeds: [messageEmbed] });
            })
            .catch((error) => { console.error });

    }
};