const { SlashCommandBuilder } = require("discord.js");
const { readFileSync } = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Check all the songs in the music queue"),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const guildId = interaction.guildId;
        let songList = getSongList();
        if (!songList || !(guildId in songList) || !songList[guildId].song_list.length) return interaction.editReply("There are no songs in the queue right now.")
        let res = "Got it! The queued songs are:\n"
        await interaction.editReply(res);
        for (let i = 0; i < songList[guildId].song_list.length; i++) {
            var songTitle = songList[guildId].song_list[i][0];
            var songAuthor = songList[guildId].song_list[i][1];
            res += `\`${i + 1}\` : \`${songTitle}\` - \`${songAuthor}\` \n`
        }

        await interaction.editReply(res);
    },
};

/**
 * Retrieves the song list from the 'song_list.json' file.
 * 
 * @returns {Array|null} The parsed song list or null if an error occurs.
 */
function getSongList() {
    try {
        const data = readFileSync('song_list.json');
        return JSON.parse(data);
    } catch {
        return null;
    }
}