const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Summoner, Match } = require("../../models");
const { Op } = require('sequelize');

const MINIMUM_NUMBER_OF_GAMES = 5;
const LEADERBOARD_LENGTH = 10;

module.exports = {
    category: 'tournament',
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Shows the top 10 players from the leaderboard (players that have at least 3 games)"),
    async execute(interaction) {
        await interaction.deferReply();
        const clientAvatar = interaction.client.user.avatarURL();
        const memberName = interaction.member.displayName;
        const memberAvatar = interaction.member.user.avatarURL();

        const emojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

        const leaderboard = await Summoner.findAll({
            where: {
                totalGames: {
                    [Op.gte]: MINIMUM_NUMBER_OF_GAMES
                }
            },
            order: [
                ['winrate', 'DESC'],
                ['kda', 'DESC'],
            ],
            limit: LEADERBOARD_LENGTH,
        })

        const totalMatches = await Match.count();

        const messageEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`🏆 Leaderboard 🏆`)
            .setAuthor({ name: memberName, iconURL: memberAvatar })
            .setTimestamp()
            .setFooter({ text: 'Lollipop' + ` - ${totalMatches} games saved`, iconURL: clientAvatar });

        for (const summonerIndex in leaderboard) {
            const summonerObject = leaderboard[summonerIndex];
            const emoji = emojis[summonerIndex];
            messageEmbed.addFields(
                { name: `${emoji} ${summonerObject.riotIdGameName}`, value: `**${Math.round(summonerObject.winrate * 100) / 100}% winrate** (${summonerObject.wins}W/${summonerObject.losses}L - ${Math.round(summonerObject.kda * 100) / 100} KDA)` },
            );
        }
        return interaction.editReply({ embeds: [messageEmbed] });
    }
};