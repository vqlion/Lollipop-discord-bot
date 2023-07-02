const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("protect")
        .setDescription("Protects the server from a raid. Blocks all text and audio channels.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        if (!(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))) return interaction.reply("You do not have permission to run this command.")
        
        const confirm = new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Yes, lock the server')
            .setStyle(ButtonStyle.Success);

        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(confirm, cancel);


        const response = await interaction.reply({
            content: `⚠️ Are you sure you want to issue this command ? **It will block all the text channels in the server. **⚠️ \n You will be able to revert this action afterwards.`,
            components: [row],
        });

        const filter = i => i.user.id === interaction.user.id;
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 60_000 });

            if (confirmation.customId === 'confirm') {
                await confirmation.update({ content: `Ok, protecting the server from a raid. Blocking everyone from sending messages in all channels.`, components: [] });
                const guild = interaction.guild.fetch().then((guild) => {
                    guild.channels.cache.forEach((channel) => {
                        if (channel.type == 11 || channel.type == 12) {
                            channel.setLocked(true).then().catch(console.error);
                        } else if (channel.type != 4) {
                            channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).then().catch(console.error);
                        }
                    })
                });
            } else if (confirmation.customId === 'cancel') {
                await confirmation.update({ content: 'The command has been cancelled.', components: [] });
            }
        } catch (e) {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute. The command has been cancelled.', components: [] });
        }
    },
};
