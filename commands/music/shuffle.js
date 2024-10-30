const { SlashCommandBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const db = require('./utils/dbHelpers');

module.exports = {
    category: 'music',
    data: new SlashCommandBuilder()
        .setName("shuffle")
        .setDescription("Shuffles the queue"),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.member.voice.channel;
        const guildId = interaction.guildId;

        if (!channel) {
            return interaction.editReply(
                "You must be in a voice channel to perform this command."
            );
        }

        let connection = getVoiceConnection(channel.guildId);
        let player;
        if (connection) player = connection.state.subscription.player;

        if (!connection) {
            return interaction.editReply(
                "The bot is not connected to a voice channel."
            );
        } else if (connection.joinConfig.channelId !== channel.id) {
            return interaction.editReply(
                "You must be in the same voice channel as the bot to perform this command."
            );
        }

        const queueSize = await db.getQueueSize(guildId);

        if (queueSize < 2) {
            return interaction.editReply("The queue is too short to be shuffled.");
        }

        if (player) {
            await db.shuffleQueue(guildId);
            return interaction.editReply("Got it, the queue has been shuffled. It will be be visible when the next song is played.");
        } else {
            return interaction.editReply(
                "The bot isn't playing any song right now!"
            );
        }
    },
};
