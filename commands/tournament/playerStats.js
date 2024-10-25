const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { spawn } = require("child_process");
const axios = require('axios').default;


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

        const pythonProcess = spawn('python3', ["./commands/tournament/utils/player_stats.py", summonerName, summonerTag]);

        pythonProcess.stdout.on('data', (data) => {
            const response = data.toString();
            console.log(data.toString());
            if (response.includes('False')) {
                return interaction.editReply("Couldn't find the player you're looking for. Please check the summoner's name and tag.");
            }

            const stats = JSON.parse(response);

            axios.get('https://ddragon.leagueoflegends.com/api/versions.json')
                .then((response) => {
                    const version = response.data[0];

                    const messageEmbed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle(`${stats.name}#${summonerTag}`)
                        .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${stats.icon_id}.png`)
                        .setAuthor({ name: memberName, iconURL: memberAvatar })
                        .addFields(
                            { name: 'Winrate', value: `**${Math.round(stats.winrate * 100) / 100}%** (${stats.wins}/${stats.loses})` },
                            { name: 'Number of games', value: `**${stats.total_games}**` },
                            { name: 'KDA', value: `**${Math.round(stats.kda * 100) / 100}** (${stats.kills}/${stats.deaths}/${stats.assists})` },
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Lollipop', iconURL: clientAvatar });
                    return interaction.editReply({ embeds: [messageEmbed] });
                })
                .catch((error) => { console.error });
        });

    }
};