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
        const options = interaction.options.getString("options").split(",").map((option) => option.trim()); // trim to remove spaces
        const unique = interaction.options.getBoolean("unique") ?? false;
        const memberName = interaction.member.displayName;
        const memberAvatar = interaction.member.avatarURL() ?? interaction.member.user.avatarURL();
        const memberId = interaction.member.user.tag;

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

        const row = new ActionRowBuilder()
            .addComponents(components);


        const response = await interaction.reply({
            embeds: [generateEmbedResponseMessage(question, components, memberId, memberAvatar, answers)],
            components: [row]
        });

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });

        collector.on('collect', async i => {
            const selection = i.customId;
            const memberVote = i.member;
            var sameVote = false;
            if (answers[selection].find((answer) => answer.member.id === memberVote.id)) { // remove the vote if the user has already voted for this answer
                const answerIndex = answers[selection].findIndex((answer) => answer.member.id === memberVote.id);
                answers[selection].splice(answerIndex, 1);
                sameVote = true;
                await i.reply({ content: `Removed your vote for ${components.find((button) => button.data.custom_id === selection).data.label}.`, ephemeral: true });
            }

            if (unique) { // user can only vote for one option
                for (const [key, value] of Object.entries(answers)) {
                    const alreadyAnswered = value.findIndex((answer) => answer.member.id === memberVote.id); // find if the user has already answered
                    if (alreadyAnswered >= 0) {
                        answers[key].splice(alreadyAnswered, 1); // remove their previous answer 
                    }
                }
            }
            if (!sameVote) {
                answers[selection].push({ member: memberVote, selection: selection });
                await i.reply({ content: `You have selected ${components.find((button) => button.data.custom_id === selection).data.label}!`, ephemeral: true });
            }

            await interaction.editReply({
                embeds: [generateEmbedResponseMessage(question, components, memberId, memberAvatar, answers)],
                components: [row]
            });
        });
    },
};

function generateEmbedResponseMessage(question, buttons, author, authorAvatar, ans) {
    optionFields = [];

    for (const [key, value] of Object.entries(ans)) {
        var optionLabel = buttons.find((button) => button.data.custom_id === key);
        optionLabel = optionLabel.data.label;
        optionFields.push({
            name: optionLabel,
            value: value.length > 0 ? value.map((answer) => userMention(answer.member.id)).join(", ") : "No votes yet",
        });
    }

    const embededReply = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Poll: **${question}**`)
        .setAuthor({ name: author, iconURL: authorAvatar })
        .addFields(optionFields)
        .setTimestamp()
        .setFooter({ text: 'Lollipop', iconURL: clientAvatar });

    return embededReply;
}