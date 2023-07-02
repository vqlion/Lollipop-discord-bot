const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unprotect")
        .setDescription("Resets the server after a protection. All the channels regain their default permissions.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        if (!(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))) return interaction.reply("You do not have permission to run this command.")
        
        const confirm = new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Unlock the server')
            .setStyle(ButtonStyle.Success);

        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Keep the server locked')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(cancel, confirm);


        const response = await interaction.reply({
            content: `Please confirm you want to unlock the server.`,
            components: [row],
        });

        const filter = i => i.user.id === interaction.user.id;
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 60_000 });

            if (confirmation.customId === 'confirm') {
                await confirmation.update({ content: `Ok, unlocking the server. All text channels are back to their normal permissions.`, components: [] });
                const guild = interaction.guild.fetch().then((guild) => {
                    guild.channels.cache.forEach((channel) => {
                        if (channel.type == 11 || channel.type == 12) {
                            channel.setLocked(false).then().catch(console.error);
                        } else if (channel.type != 4) {
                            channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }).then().catch(console.error);
                        }
                    })
                });
            } else if (confirmation.customId === 'cancel') {
                await confirmation.update({ content: 'Command cancelled. The server remains locked.', components: [] });
            }
        } catch (e) {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute. Keeping the server locked.', components: [] });
        }
    },
};
