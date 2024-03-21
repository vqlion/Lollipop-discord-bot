const { SlashCommandBuilder, PermissionFlagsBits, ComponentType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, userMention } = require("discord.js");

var clientAvatar;

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
        const memberName = interaction.member.displayName;
        const memberAvatar = interaction.member.avatarURL();
        const memberId = interaction.member.user.tag;

        clientAvatar = interaction.client.user.avatarURL();

        var answers = {};

        if (options.length < 2) {
            interaction.reply({ content: "You need to provide at least 2 options.", ephemeral: true });
        }

        var components = [];
        options.forEach((option, index) => {
            const button = new ButtonBuilder()
                .setCustomId(`option_${index}`)
                .setLabel(option)
                .setStyle(ButtonStyle.Primary);
            
            answers[`option_${index}`] = [];
            components.push(button);
        });

        console.log(answers)

        const row = new ActionRowBuilder()
            .addComponents(components);


        const response = await interaction.reply({
            embeds: [generateEmbedResponseMessage(question, options, memberId, memberAvatar)],
            components: [row],
        });

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });

        collector.on('collect', async i => {
            console.log(i.customId);
            const selection = i.customId;
            const memberVote = i.member;
            answers[selection].push({ member: memberVote, selection: selection });
            // await i.reply(`${i.user} has selected ${selection}!`);
        });
    },
};

function generateEmbedResponseMessage(question, options, author, authorAvatar, ans) {
    optionFields = [];
    
    options.forEach((option, index) => {
        optionFields.push({ name: option, value: option });
    });

    const embededReply = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Poll: **${question}**`)
        .setAuthor({ name: 'Lollipop', iconURL: clientAvatar })
        .addFields(optionFields)
        .setTimestamp()
        .setFooter({ text: author, iconURL: authorAvatar });

    return embededReply;
}