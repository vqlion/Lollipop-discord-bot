const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName("delete_channels")
        .setDescription("Deletes all the channels in the category")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        if (!(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))) return interaction.reply("You do not have permission to run this command.")

        const channel = interaction.channel;
        const category = channel.parent;
        const channelsInCategory = Array.from(category.children.cache.values());

        const confirm = new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success);

        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(cancel, confirm);


        const response = await interaction.reply({
            content: `⚠️ Are you sure you want to delete all the channels in the \`${category.name}\` category? ⚠️`,
            components: [row],
        });

        const filter = i => i.user.id === interaction.user.id;
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 60_000 });

            if (confirmation.customId === 'confirm') {
                await confirmation.update({ content: `Ok, deleting all the channels in the \`${category.name}\` category.`, components: [] });
                channelsInCategory.forEach((channel) => {
                    channel.delete().then().catch(console.error)
                })
                category.delete().then().catch(console.error);
            } else if (confirmation.customId === 'cancel') {
                await confirmation.update({ content: 'Action cancelled', components: [] });
            }
        } catch (e) {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
        }
    },
};
