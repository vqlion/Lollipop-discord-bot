const { SlashCommandBuilder, PermissionFlagsBits, ComponentType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, userMention } = require("discord.js");
const { spawn } = require("child_process");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("add_match")
        .setDescription("Adds a match to the tournament database")
        .addStringOption((option) =>
            option
                .setName("match_id")
                .setDescription("The Id of the match. You can put multiple ones and separate them with a comma.")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("api_key")
                .setDescription("The riot games api key")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const matchId = interaction.options.getString("match_id");
        const apiKey = interaction.options.getString("api_key");

        const pythonProcess = spawn('python3', ["./commands/tournament/utils/add_match.py", matchId, apiKey]);

        pythonProcess.stdout.on('data', (data) => {
            interaction.editReply(data.toString());
            console.log(data.toString());
        });
    }
};