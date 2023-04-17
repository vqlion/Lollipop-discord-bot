const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Deletes the last messages (max 100)")
        .addIntegerOption((option) =>
            option
                .setName("number")
                .setDescription("The number of messages to delete")
                .setRequired(true)
        ),
    async execute(interaction) {
        const number = interaction.options.getInteger("number");
        const channel = interaction.channel;
        await interaction.reply(`Ok, deleting the ${number} last messages.`);
        channel.messages
            .fetch({ limit: Math.min(number + 1, 100), cache: false })
            .then((messages) => {
                messages.forEach((message) =>
                    message.delete().then().catch(console.error)
                );
            })
            .catch(console.error);
    },
};
