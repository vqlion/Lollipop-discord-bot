const { Events } = require('discord.js');
const { special_guilds } = require('../config.json');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const messageContent = message.content;
        const guildId = message.guildId;
        const normalizedMessageContent = messageContent.normalize('NFD').replace(/\p{Diacritic}/gu, "").toLowerCase()
        if (!normalizedMessageContent.includes("quoi") || !(special_guilds.includes(guildId))) return;
        message.reply("feur")
            .then()
            .catch(console.error);
    },
};