const { SlashCommandBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stops the current song and disconnects the bot"),
    async execute(interaction) {
        await interaction.deferReply();
        const channel = interaction.member.voice.channel;

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

        interaction.editReply("Got it! Disconnecting the bot.");
        if (connection) connection.destroy();
        if (player) player.stop();
    },
};
