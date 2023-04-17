const { SlashCommandBuilder } = require("discord.js");
const { readFileSync } = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Check all the songs in the music queue"),
    async execute(interaction) {
        await interaction.deferReply();
        const guildId = interaction.guildId;
        let songList = getSongList();
        if (!songList || !(guildId in songList) || !songList[guildId].length) return interaction.editReply("There are no songs in the queue right now.")
        let res = "Got it! The queued songs are:\n"
        await interaction.editReply(res);
        for (let i = 0; i < songList[guildId].length; i++) {
            res += `\`${i + 1}\` : \`${songList[guildId][i]}\` \n`
        }

        await interaction.editReply(res);
    },
};

function getSongList() {
    try {
        const data = readFileSync('song_list.json');
        return JSON.parse(data);
    } catch {
        return null;
    }
}