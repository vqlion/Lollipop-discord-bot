const { SlashCommandBuilder } = require("discord.js");
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
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const member = interaction.member;

        if (!member.roles.cache.find(role => role.name === 'Tournament admin')) {
            return interaction.editReply("You don't have the permission to use this command.");
        }

        const matchId = interaction.options.getString("match_id");

        const pythonProcess = spawn('python3', ["./commands/tournament/utils/add_match.py", matchId]);

        pythonProcess.stdout.on('data', (data) => {
            var response = data.toString().includes("True");
            console.log(data.toString());
            if (response) {
                interaction.editReply(`Match ${matchId} added successfully!`);
            } else {
                interaction.editReply("Couldn't add your match to the database. Please check the match id.");
            }
        });
    }
};