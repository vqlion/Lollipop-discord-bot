const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType } = require("discord.js");

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName("create_channels")
        .setDescription("Creates a new category with channels in it. The channels will be created as \'prefix-number\'.")
        .addIntegerOption((option) =>
            option
                .setName("number")
                .setDescription("The number of channels to create")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("prefix")
                .setDescription("The prefix to put at the beginning of the channels' names")
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("The name of the new category")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        if (!(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))) return interaction.reply("You do not have permission to run this command.")

        const guild = interaction.guild;
        const number = interaction.options.getInteger("number");
        const prefix = interaction.options.getString("prefix");
        const name = interaction.options.getString("name");

        if (number <= 0) return interaction.reply({ content: "The number of channels must be at least one.", ephemeral: true })

        await interaction.reply(`Got it! Creating a new \`${name ?? "Text-channels"}\` category with \`${number}\` channels in it.`)

        guild.channels.create({
            name: name ?? "Text-channels",
            type: ChannelType.GuildCategory,
        }).then((category) => {
            for (let i = 0; i < number; i++) {
                guild.channels.create({
                    name: `${prefix ?? ""}-${i + 1}`,
                    type: ChannelType.GuildText,
                }).then((channel) => { channel.setParent(category) }).then().catch(console.error)
            }
        }).catch(console.error)
    },
};
