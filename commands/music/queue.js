const { SlashCommandBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const fs = require("fs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Check all the songs in the music queue"),
    async execute(interaction) {
        const guildId = interaction.guildId;
        let songList = play.getSongList(guildId);
        console.log(songList);
    },
};

function getSongList(guildId) {
    let obj;
    fs.readFile('song_list.json', 'utf8', function readFileCallback(err, data){
        if (err){
            console.log(err);
        } else {
        obj = JSON.parse(data);  
    }});
    return obj;
}