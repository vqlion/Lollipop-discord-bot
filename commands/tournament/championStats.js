const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { spawn } = require("child_process");
const axios = require('axios').default;


module.exports = {
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
        const memberAvatar = interaction.member.user.avatarURL();

        const championName = interaction.options.getString("name");

        const pythonProcess = spawn('python3', ["./commands/tournament/utils/champion_stats.py", championName]);

        pythonProcess.stdout.on('data', (data) => {
            const response = data.toString();
            console.log(data.toString());
            if (response.includes('False')) {
                return interaction.editReply("Couldn't find the champion you're looking for. They may not be in the database if no one has played them yet.");
            }

            const stats = JSON.parse(response);

            axios.get('https://ddragon.leagueoflegends.com/api/versions.json')
                .then((response) => {
                    const version = response.data[0];

                    const messageEmbed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle(`${stats.name}`)
                        .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${stats.name}.png`)
                        .setAuthor({ name: memberName, iconURL: memberAvatar })
                        .addFields(
                            { name: 'Winrate', value: `**${Math.round(stats.winrate * 100) / 100}%** (${stats.wins}/${stats.loses})` },
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Lollipop', iconURL: clientAvatar });
                    return interaction.editReply({ embeds: [messageEmbed] });
                })
                .catch((error) => { console.error });
        });

    }
};