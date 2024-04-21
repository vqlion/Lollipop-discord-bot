const { SlashCommandBuilder, ChannelType, EmbedBuilder, Message, TextChannel } = require("discord.js");
const playdl = require("play-dl");
const axios = require('axios').default;
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    VoiceConnectionStatus,
    getVoiceConnection,
    AudioPlayerStatus,
} = require("@discordjs/voice");
const fs = require("fs");
const { youtube_api_key } = require('../../config.json')

var clientAvatar; // Avatar (profile picture) of the bot
let nextResourceIsAvailable = true;
const DELETE_REPLY_TIMEOUT = 5000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play any song from Youtube")
        .addStringOption((option) =>
            option
                .setName("song")
                .setDescription("The song you want to play")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const channel = interaction.member.voice.channel; // the voice channel the bot is gonna be in
        const request = interaction.options.getString("song");
        const guildId = interaction.guildId;
        const channelList = Array.from(interaction.guild.channels.cache.values());
        const memberName = interaction.member.displayName;
        const memberAvatar = interaction.member.user.avatarURL();
        clientAvatar = interaction.client.user.avatarURL();

        /**
         * ID of the status message
         * This is the ID of the message updated each time a new song is added.
         * It is created via the setStatusMessage function, it's an embed message.
        */
        var statusMessageId = getStatusMessageIdFronJsonFile(guildId);  

        var statusMessage; // status message mentioned earlier
        if (statusMessageId) {
            try {
                await interaction.channel.messages.fetch(statusMessageId).then((msg) => {
                    statusMessage = msg;
                }).catch(statusMessage = null);
            } catch (error) {
                statusMessage = null;
            }
        }

        /**
         * statusChannel is the channel in which the status message is sent.
         * The bot searches for it by name each time the play command is issued.
         */
        var statusChannel;
        var foundStatusChannel = false;
        for (i = 0; i < channelList.length; i++) {
            if (channelList[i].type != ChannelType.GuildText) continue;
            if (channelList[i].name.includes("lollipop")) {
                statusChannel = channelList[i];
                foundStatusChannel = true;
                break;
            }
        }

        // create the status channel if it doesn't exist...
        if (!foundStatusChannel) {
            await interaction.guild.channels.create({
                name: "🎵 Playlist - Lollipop",
                type: ChannelType.GuildText,
            }).then((chan) => {
                statusChannel = chan;
            }).catch(console.error);
        }

        /**
         * statusThread is a thread in the status channel.
         * The bot sends a message in it every time a new song is added, with the song's name author.
         */
        var statusThread = statusChannel.threads.cache.find(thread => thread.name === "🎵 Song history - Lollipop");
        if (!statusThread) {
            await statusChannel.threads.create({
                name: "🎵 Song history - Lollipop",
                autoArchiveDuration: 60,
            }).then((thread) => {
                statusThread = thread;
            }).catch(console.error);
        }

        if (!statusThread.locked) statusThread.setLocked(true).then().catch(console.error);


        if (!channel) {
            return interaction.editReply(
                "You must be in a voice channel to perform this command."
            ).then(() => {
                setTimeout(() => { interaction.deleteReply().then().catch(console.error) }, DELETE_REPLY_TIMEOUT);
            }).catch(console.error);
        }

        var connection = getVoiceConnection(channel.guildId);
        var player;

        if (!connection) {
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guildId,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            player = createAudioPlayer();
            connection.subscribe(player);
        } else if (connection.joinConfig.channelId !== channel.id) {
            return interaction.editReply(
                "You must be in the same voice channel as the bot to perform this command."
            ).then(() => {
                setTimeout(() => { interaction.deleteReply().then().catch(console.error) }, DELETE_REPLY_TIMEOUT);
            }).catch(console.error);
        }

        var url = request;
        var title = null;

        if (!isValidHttpUrl(request)) {
            var yt_info = await playdl.search(request, { limit: 1 });
            url = yt_info[0].url;
            title = yt_info[0].title;
        } else {
            title = await getSongTitleFromURL(url);
        }

        if (isPlaylistUrl(request)) {
            var playlist_info = await playdl.playlist_info(request);
            var videos_info = await playlist_info.all_videos();
            url = videos_info[0].url;
            title = videos_info[0].title;
            videos_info.shift();
            pushPlayListToSongList(videos_info, memberName, memberAvatar, guildId);
        }

        if (!player) {
            player = connection.state.subscription.player;
        }

        title = title ?? request;

        if (player.state.status == "playing") { // the bot is already playing something, add the song to the queue
            pushNewSongName(title, memberName, memberAvatar, url, guildId);

            await interaction.editReply(
                `\`${memberName}\` put \`${title}\` in the queue. It is currently at position \`${0}\`.`
            ).then(() => {
                setTimeout(() => { interaction.deleteReply().then().catch(console.error) }, DELETE_REPLY_TIMEOUT);
            }).catch(console.error);

            statusThread.send(`\`${memberName}\` put \`${title}\` in the queue.`)
                .then()
                .catch(console.error);
            
            [currentTitle, currentTitleUsername, currentTitleAvatar] = getCurrentSongName(guildId);
            setStatusMessage(currentTitle, currentTitleUsername, currentTitleAvatar, guildId, statusMessage, statusChannel);
        } else {
            await interaction.editReply(`Got it! Playing \`${title}\` (asked by \`${memberName}\`)`).then(() => {
                setTimeout(() => { interaction.deleteReply().then().catch(console.error) }, DELETE_REPLY_TIMEOUT);
            }).catch(console.error);

            statusThread.send(`\`${memberName}\` put \`${title}\` in the queue.`)
                .then()
                .catch(console.error);
            
            resetResourceList(guildId);
            pushCurrentSongName(title, memberName, memberAvatar, guildId);

            var stream = await playdl.stream(url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
            });
            player.play(resource);
            setStatusMessage(title, memberName, memberAvatar, guildId, statusMessage, statusChannel);
        }

        connection.on(
            VoiceConnectionStatus.Disconnected,
            async (oldState, newState) => {
                var statusMessageId = getStatusMessageIdFronJsonFile(guildId);
                if (statusMessageId) {
                    try {
                        await interaction.channel.messages.fetch(statusMessageId).then((msg) => {
                            msg.delete().then().catch(console.error);
                        }).catch();
                    } catch (error) { }
                }
                try {
                    connection.destroy();
                    player.stop();
                } catch (error) {
                    console.error;
                }
                resetResourceList(guildId);
            }
        );

        connection.on(
            VoiceConnectionStatus.Destroyed,
            async (oldState, newState) => {
                var statusMessageId = getStatusMessageIdFronJsonFile(guildId);
                if (statusMessageId) {
                    try {
                        await interaction.channel.messages.fetch(statusMessageId).then((msg) => {
                            msg.delete().then().catch(console.error);
                        }).catch();
                    } catch (error) { }
                }
                try {
                    connection.destroy();
                    player.stop();
                } catch (error) {
                    console.error;
                }
                resetResourceList(guildId);
            }
        )

        player.on("error", (error) => {
            console.error(error);
        });

        player.addListener("stateChange", async (oldState, newState) => {
            /**
             * I know this if statement looks overwhelming and complicated but!
             * basically it just checks if the song has been skipped or has finished :)
             */
            if (
                nextResourceIsAvailable &&
                newState.status == AudioPlayerStatus.Idle &&
                oldState.status == AudioPlayerStatus.Playing
            ) {
                /**
                 * nextResourceIsAvailable is weird.
                 * When a song is skipped the bot goes from Idle to Playing multiple times for some reason
                 * nextResourceIsAvailable is true by default, and turns false for 100ms when the if statement passes
                 * This enforces that the if statement only passes once (so the music is skipped only once...)
                 */
                if (nextResourceIsAvailable) {
                    nextResourceIsAvailable = false;
                    setTimeout(() => {
                        nextResourceIsAvailable = true;
                    }, 100);
                }

                var statusMessageId = getStatusMessageIdFronJsonFile(guildId);
                await interaction.channel.messages.fetch(statusMessageId).then(async (statusMessage) => {
                    setStatusMessage("Skipping...", "...", clientAvatar, guildId, statusMessage, statusChannel);

                    var [nextResourceUrl, nextResourceTitle, nextResourceAuthor, nextResourceAvatar] = getNextResource(guildId);
                    if (nextResourceUrl) {
                        var stream = await playdl.stream(nextResourceUrl);
                        const resource = createAudioResource(stream.stream, {
                            inputType: stream.type,
                        });
                        player.play(resource);
                    }

                    pushCurrentSongName(nextResourceTitle, nextResourceAuthor, nextResourceAvatar, guildId);

                    if (nextResourceTitle) setStatusMessage(nextResourceTitle, nextResourceAuthor, nextResourceAvatar, guildId, statusMessage, statusChannel);
                    else setStatusMessage("Not currently playing", "waiting for new songs", clientAvatar, guildId, statusMessage, statusChannel);
                }).catch();
            }
        });
    },
};

/**
 * Checks if a given string is a valid HTTP or HTTPS URL.
 *
 * @param {string} url The string to be checked.
 * @returns {boolean} true if the string is a valid HTTP or HTTPS URL, false otherwise.
 */
function isValidHttpUrl(url) {
    let url;
    try {
        url = new URL(url);
    } catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * Checks if a given string is a youtube playlist URL. Assumes the url is valid and a youtube URL.
 * 
 * @param {string} url The string to be checked.
 * @returns {boolean} true if the string is a valid playlist URL, false otherwise.
 */
function isPlaylistUrl(url) {
    return isValidHttpUrl(url) && url.includes("playlist");
}

/**
 * Retrieves the song title from a YouTube URL.
 * 
 * @param {string} url - The YouTube URL.
 * @returns {Promise<string>} The song title.
 */
async function getSongTitleFromURL(url) {
    var id = url.substring(
        url.indexOf("?v=") + 3 
    );
    if (url.includes("&ab_channel")) { // this is ugly and there is probably a better way to do it. oh well :)
        id = url.substring(
            url.indexOf("?v=") + 3, // the +3 irritates me but I don't know how to fix it now
            url.lastIndexOf("&")
        );
    }
    var songTitle;
    try {
        const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=id%2C+snippet&id=${id}&key=${youtube_api_key}`);
        songTitle = response["data"]["items"][0]["snippet"]["title"]; // sorry about that
    } catch (error) {
        console.error(error);
    }

    return songTitle;
}

/**
 * Adds the songs from the songList to the queue. Used to add an entire playlist.
 *
 * @param {Array} songList - The list of songs to be added to the queue.
 * @param {string} author - The name of the person who added the songs.
 * @param {string} authorAvatar - The profile picture URL of the author.
 * @param {string} guildId - The ID of the guild where the songs are being added.
 * @returns {void}
 */
async function pushPlayListToSongList(songList, author, authorAvatar, guildId) {
    for (entry in songList) {
        var url = songList[entry].url;
        var title = songList[entry].title;

        pushNewSongName(title, author, authorAvatar, url, guildId);
    }
}

/**
 * Pushes a new song to the song list and saves it back to the JSON file.
 * 
 * @param {string} song - The name of the song.
 * @param {string} author - The name of the person who added the song.
 * @param {string} authorAvatar - The profile picture URL of the author.
 * @param {string} url - The URL of the song.
 * @param {string} guildId - The ID of the guild were the song is being added.
 * @returns {void}
*/
function pushNewSongName(song, author, authorAvatar, url, guildId) {
    var songList = getSongListFromJsonFile(guildId);
    songList.song_list.push([song, author, authorAvatar, url]);
    dumpSongListToJsonFile(songList, guildId);
}

/**
 * Updates the current song information in the song list and saves it back to the JSON file.
 * 
 * @param {string} song - The name of the current song.
 * @param {string} author - The name of the person who added the song.
 * @param {string} authorAvatar - The profile picture URL of the author.
 * @param {string} guildId - The ID of the guild were the song is being added.
 * @returns {void}
 */
function pushCurrentSongName(song, author, authorAvatar, guildId) {
    var songList = getSongListFromJsonFile(guildId);
    songList.current_song = [song, author, authorAvatar];
    dumpSongListToJsonFile(songList, guildId);
}

/**
 * Retrieves the name, author name and author avatar URL of the current song for a given guild.
 * 
 * @param {string} guildId - The ID of the guild.
 * @returns {Array} [song, author, authorAvatar]
 */
function getCurrentSongName(guildId) {
    const songList = getSongListFromJsonFile(guildId);
    return songList.current_song;
}

/**
 * Retrieves the next resource from the song list for the specified guild.
 * 
 * @param {string} guildId - The ID of the guild.
 * @returns {Array} An array containing the resource URL, the song title, the author and the author's avatar URL for the next song.
 */
function getNextResource(guildId) {
    var songList = getSongListFromJsonFile(guildId);
    var resInfo = songList.song_list.shift();
    if (!resInfo) return [null, null, null, null];
    var resTitle = resInfo[0];
    var resAuthor = resInfo[1];
    var resAuthorAvatar = resInfo[2];
    var res = resInfo[3];
    dumpSongListToJsonFile(songList, guildId);
    return [res, resTitle, resAuthor, resAuthorAvatar];
}

/**
 * Resets the resource list for the specified guild and saves it to the JSON file.
 * 
 * @param {string} guildId - The ID of the guild.
 * @returns {void}
 */
function resetResourceList(guildId) {
    const songList = { "current_song": [], "song_list": [] };
    dumpSongListToJsonFile(songList, guildId);
}

/**
 * Writes the given song list to the JSON file, associated with the specified guild ID.
 *
 * @param {Array} songList - The list of songs to be dumped to the JSON file.
 * @param {string} guildId - The ID of the guild associated with the song list.
 * @returns {void}
 */
function dumpSongListToJsonFile(songList, guildId) {
    var fileData;
    var data;
    try {
        data = fs.readFileSync("song_list.json");
    } catch (error) { }
    if (data == null || data.length == 0) fileData = new Object();
    else fileData = JSON.parse(data);
    fileData[guildId] = songList;
    fs.writeFileSync( // this is fine. Maybe a lock could do the trick to be extra sure but this is fine
        "song_list.json",
        JSON.stringify(fileData),
        function (err) {
            if (err) throw err;
        }
    );
}

/**
 * Retrieves the song list from the JSON file based on the guild ID.
 * 
 * @param {string} guildId - The ID of the guild.
 * @returns {Object} - The song list for the specified guild.
 */
function getSongListFromJsonFile(guildId) {
    var songList;
    var data;
    try {
        data = fs.readFileSync("song_list.json");
    } catch (error) {
        console.error;
    }
    if (data == null || data.length == 0) return { "current_song": [], "song_list": [] };
    songList = JSON.parse(data);
    return songList[guildId];
}

/**
 * Writes the status message ID to the JSON file in the specified guildID entry.
 * 
 * @param {string} statusMessageId - The ID of the status message.
 * @param {string} guildId - The ID of the guild.
 * @returns {void}
 */
function dumpStatusMessageToJsonFile(statusMessageId, guildId) {
    var statusMessagesList;
    var data;
    try {
        data = fs.readFileSync("status_messages.json");
    } catch (error) { }
    if (data == null || data.length == 0) statusMessagesList = new Object();
    else statusMessagesList = JSON.parse(data);
    statusMessagesList[guildId] = statusMessageId;
    fs.writeFileSync(
        "status_messages.json",
        JSON.stringify(statusMessagesList),
        function (err) {
            if (err) throw err;
        }
    );
}

/**
 * Retrieves the status message ID from the JSON file based on the guild ID.
 * 
 * @param {string} guildId - The ID of the guild.
 * @returns {string|null} - The status message ID if found, or null if not found.
 */
function getStatusMessageIdFronJsonFile(guildId) {
    var data;
    try {
        data = fs.readFileSync("status_messages.json");
    } catch (error) { }
    if (data == null || data.length == 0) return null;
    var statusMessagesList = JSON.parse(data);
    return statusMessagesList[guildId];
}


/**
 * Sets and sends/edits the status message for the current playing song.
 *
 * @param {string} currentTitle - The title of the current song.
 * @param {string} author - The name of the person who added the current song.
 * @param {string} authorAvatar - The profile picture URL of the author.
 * @param {string} guildId - The ID of the guild.
 * @param {Message} statusMessage - The current discord status message.
 * @param {TextChannel} statusChannel - The channel where the status message should be sent.
 * @returns {Promise<void>} A promise that resolves once the status message is set.
 */
async function setStatusMessage(currentTitle, author, authorAvatar, guildId, statusMessage, statusChannel) {
    const embededReply = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🎵 Now playing')
        .setAuthor({ name: 'Lollipop', iconURL: clientAvatar })
        .setDescription(`**${currentTitle}** - \`${author}\``)
        .setThumbnail(authorAvatar)
        .addFields(
            { name: '⏩ Next songs', value: getNextSongs(guildId) },
        )
        .setTimestamp()

    if (!statusMessage) {
        await statusChannel.send({ embeds: [embededReply] }).then((msg) => {
            statusMessage = msg;
        }).catch(console.error);
    } else {
        await statusMessage.edit({ embeds: [embededReply] }).then((msg) => {
            statusMessage = msg;
        }).catch(console.error);
    }
    dumpStatusMessageToJsonFile(statusMessage.id, guildId);
}

/**
 * Retrieves the next 3 songs in the queue for a specific guild.
 * 
 * @param {string} guildId - The ID of the guild.
 * @returns {string} - A formatted string containing the titles and authors of the next songs in the queue.
 */
function getNextSongs(guildId) {
    const songList = getSongListFromJsonFile(guildId);
    var res = ""
    for (let i = 0; i < Math.min(songList.song_list.length, 3); i++) {
        var songTitle = songList.song_list[i][0];
        var songAuthor = songList.song_list[i][1];
        res += `**${songTitle}** - \`${songAuthor}\``
        res += i == Math.min(songList.song_list.length, 3) - 1 ? "" : "\n";
    }
    res += songList.song_list.length > 3 ? "\n**...**" : "\u200B";
    res += songList.song_list.length == 0 ? "No songs in queue" : "\u200B"; // don't ask
    return res;
}
