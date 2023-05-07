const { Events } = require('discord.js');
const { special_guilds } = require('../config.json');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const messageAttachments = message.attachments
        const guildId = message.guildId;
        
        if (messageAttachments.size == 0 || !(special_guilds.includes(guildId))) return;

        const contentType = messageAttachments.at(0).contentType
        if (contentType.includes('audio')) {
            message.delete()
                .then()
                .catch(console.error);
        }
    },
};