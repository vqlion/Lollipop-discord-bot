const { SlashCommandBuilder } = require("discord.js");
const { readFileSync } = require('fs');
const db = require('./utils/dbHelpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Check all the songs in the music queue"),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const guildId = interaction.guildId;
        let songList = getSongList();
        db.getQueue(guildId).then((queue) => {
            if (!queue || !queue.length) return interaction.editReply("There are no songs in the queue right now.");
            let res = "Got it! The queued songs are:\n";
            for (let i = 0; i < queue.length; i++) {
                var songTitle = queue[i].songName;
                var songAuthor = queue[i].songAuthor;
                if ((res + `▶️ ${i + 1} : **${songTitle}** - \`${songAuthor}\` \n`).length > 2000) {
                    return interaction.editReply(res + " \n...");
                }
                res += `▶️ ${i + 1} : **${songTitle}** - \`${songAuthor}\` \n`
            }
            interaction.editReply(res);
        }).catch((err) => {
            console.error(err);
            interaction.editReply("An error occurred while trying to fetch the queue.");
        });
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