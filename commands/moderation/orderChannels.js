const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("order_channels")
        .setDescription("Orders the channels of the current category alphabetically.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        if (!(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))) return interaction.reply("You do not have permission to run this command.")

        const channel = interaction.channel;
        const category = channel.parent;
        const channelsInCategory = Array.from(category.children.cache.values());

        await interaction.reply("Got it! Ordering the channels of the current category...")

        channelsInCategory.sort((channel1, channel2) => (channel1.name > channel2.name) ? 1 : (channel1.name < channel2.name) ? -1 : 0);
        let index = 0;
        channelsInCategory.forEach((channel) => {
            channel.setPosition(index).then().catch(console.error);
            index++;
        })

        await interaction.editReply("Done! Ordered the channels of the current category.")
    },
};
