const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Deletes the last messages (max 100)")
        .addIntegerOption((option) =>
            option
                .setName("number")
                .setDescription("The number of messages to delete")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        if (!(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))) return interaction.reply("You do not have permission to run this command.")
        const number = interaction.options.getInteger("number");
        const channel = interaction.channel;
        await interaction.reply({ content: `Ok, deleting the ${number} last messages.`, ephemeral: true });
        channel.messages
            .fetch({ limit: Math.min(number, 100), cache: false })
            .then((messages) => {
                messages.forEach((message) =>
                    message.delete().then().catch(console.error)
                );
            })
            .catch(console.error);
    },
};
