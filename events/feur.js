const { Events } = require('discord.js');
const { special_guilds } = require('../config.json');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const messageContent = message.content;
        const guildId = message.guildId;
        if (!messageContent.includes("quoi") || !(special_guilds.includes(guildId))) return;
        message.reply("feur")
            .then()
            .catch(console.error);
    },
};