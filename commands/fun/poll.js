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
        )
        .addBooleanOption((option) =>
            option
                .setName("unique")
                .setDescription("Allow only one vote per user (default: false)")
                .setRequired(false)
        ),
    async execute(interaction) {

        const question = interaction.options.getString("question");
        const options = interaction.options.getString("options").split(",");
        const unique = interaction.options.getBoolean("unique") ?? false;
        const memberName = interaction.member.displayName;
        const memberAvatar = interaction.member.avatarURL();
        const memberId = interaction.member.user.tag;

        console.log(unique);

        clientAvatar = interaction.client.user.avatarURL();

        var answers = {};

        if (options.length < 2) {
            return interaction.reply({ content: 'You need to give at least 2 options.', ephemeral: true });
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
        console.log(components);

        const row = new ActionRowBuilder()
            .addComponents(components);


        const response = await interaction.reply({
            embeds: [generateEmbedResponseMessage(question, options, memberId, memberAvatar, answers)],
            components: [row]
        });

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });

        collector.on('collect', async i => {
            console.log(i.customId);
            const selection = i.customId;
            const memberVote = i.member;
            console.log(answers);
            if (answers[selection].find((answer) => answer.member.id === memberVote.id)) { // can't vote for the same answer twice
                return;
            }

            if (unique) { // user can only vote for one option
                for (const [key, value] of Object.entries(answers)) {
                    const alreadyAnswered = value.findIndex((answer) => answer.member.id === memberVote.id); // find if the user has already answered
                    if (alreadyAnswered >= 0) {
                        answers[key].splice(alreadyAnswered, 1); // remove their previous answer 
                    }
                }
            }
            console.log(answers);
            answers[selection].push({ member: memberVote, selection: selection });
            console.log(answers);
            await interaction.editReply({
                embeds: [generateEmbedResponseMessage(question, options, memberId, memberAvatar, answers)],
                components: [row]
            });
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