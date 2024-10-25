const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { spawn } = require("child_process");

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

        const pythonProcess = spawn('python3', ["./commands/tournament/utils/leaderboard.py"]);

        pythonProcess.stdout.on('data', (data) => {
            var response = data.toString();
            console.log(data.toString());
            if (response.includes('False')) {
                return interaction.editReply("Something went wrong with the command. Maybe try again later idk.");
            }

            const leaderboard = JSON.parse(response);

            const messageEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`Leaderboard`)
                .setAuthor({ name: memberName, iconURL: memberAvatar })
                .setTimestamp()
                .setFooter({ text: 'Lollipop', iconURL: clientAvatar });

            for (const playerIndex in leaderboard) {
                const player = leaderboard[playerIndex];
                const emoji = emojis[playerIndex];
                messageEmbed.addFields(
                    { name: `${emoji} ${player.name}`, value: `**${Math.round(player.winrate * 100) / 100}% winrate** (${player.wins}W/${player.loses}L - ${Math.round(player.kda * 100) / 100} KDA)` },
                );
            }
            return interaction.editReply({ embeds: [messageEmbed] });
        });
    }
};