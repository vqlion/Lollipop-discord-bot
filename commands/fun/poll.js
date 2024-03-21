const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("poll")
        .setDescription("Create a poll")
        .addStringOption((option) =>
            option
                .setName("question")
                .setDescription("The question you want to ask")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("options")
                .setDescription("The options you want to provide (min. 2). Separate them with a comma.")
                .setRequired(true)
        ),
    async execute(interaction) {

        const question = interaction.options.getString("question");
        const options = interaction.options.getString("options").split(",");

        if (options.length < 2) {
            interaction.reply({ content: "You need to provide at least 2 options.", ephemeral: true });
        }

        var components = [];
        options.forEach((option, index) => {
            const button = new ButtonBuilder()
                .setCustomId(`option_${index}`)
                .setLabel(option)
                .setStyle(ButtonStyle.Primary);

            components.push(button);
        });

        const row = new ActionRowBuilder()
            .addComponents(components);


        const response = await interaction.reply({
            content: `HIGHLY IMPORTANT POLL: ${question}`,
            components: [row],
        });

    },
};
