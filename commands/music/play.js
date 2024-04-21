const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require("discord.js");
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

var clientAvatar;
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
        const channel = interaction.member.voice.channel;
        const request = interaction.options.getString("song");
        const guildId = interaction.guildId;
        const channelList = Array.from(interaction.guild.channels.cache.values());
        const memberName = interaction.member.displayName;
        const memberAvatar = interaction.member.user.avatarURL();
        clientAvatar = interaction.client.user.avatarURL();

        var statusMessageId = getStatusMessageIdFronJsonFile(guildId);
        console.log(statusMessageId);

        var statusMessage;
        if (statusMessageId) {
            try {
                await interaction.channel.messages.fetch(statusMessageId).then((msg) => {
                    statusMessage = msg;
                }).catch(statusMessage = null);
            } catch (error) {
                statusMessage = null;
            }
        }

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

        if (!foundStatusChannel) {
            await interaction.guild.channels.create({
                name: "🎵 Playlist - Lollipop",
                type: ChannelType.GuildText,
            }).then((chan) => {
                statusChannel = chan;
            }).catch(console.error);
        }

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

        if (player.state.status == "playing") {
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
                console.log("disconnect", statusMessageId);
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
                console.log("destroy", statusMessageId);
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
            console.log(newState.status, oldState.status, nextResourceIsAvailable);
            if (
                nextResourceIsAvailable &&
                newState.status == AudioPlayerStatus.Idle &&
                oldState.status == AudioPlayerStatus.Playing
            ) {
                if (nextResourceIsAvailable) {
                    nextResourceIsAvailable = false;
                    setTimeout(() => {
                        nextResourceIsAvailable = true;
                    }, 100);
                }
                var statusMessageId = getStatusMessageIdFronJsonFile(guildId);
                await interaction.channel.messages.fetch(statusMessageId).then(async (statusMessage) => {
                    setStatusMessage("Skipping...", "...", clientAvatar, guildId, statusMessage, statusChannel);
                    var [nextResourceUrl, nextResourceTitle, nextResourceAuthor, nextResourceAvatar] = getNextResourceUrl(guildId);
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

function isValidHttpUrl(string) {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
}

function isPlaylistUrl(string) {
    return isValidHttpUrl(string) && string.includes("playlist");
}

async function pushPlayListToSongList(songList, author, authorAvatar, guildId) {

    for (entry in songList) {
        var url = songList[entry].url;
        var title = songList[entry].title;

        var stream = await playdl.stream(url);
        console.log(stream);

        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
        });

        pushNewSongName(title, author, authorAvatar, url, guildId);
    }
}

function pushNewSongName(song, author, authorAvatar, url, guildId) {
    var songList = getSongListFromJsonFile(guildId);
    songList.song_list.push([song, author, authorAvatar, url]);
    dumpSongListToJsonFile(songList, guildId);
}

function pushCurrentSongName(song, author, authorAvatar, guildId) {
    var songList = getSongListFromJsonFile(guildId);
    songList.current_song = [song, author, authorAvatar];
    dumpSongListToJsonFile(songList, guildId);
}

function getCurrentSongName(guildId) {
    const songList = getSongListFromJsonFile(guildId);
    return songList.current_song;
}


// TODO: change this for the resource
function getNextResourceUrl(guildId) {
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

// TODO: change this for new resource list archi
function resetResourceList(guildId) {
    const songList = { "current_song": [], "song_list": [] };
    dumpSongListToJsonFile(songList, guildId);
}

function dumpSongListToJsonFile(songList, guildId) {
    var fileData;
    var data;
    try {
        data = fs.readFileSync("song_list.json");
    } catch (error) { }
    if (data == null || data.length == 0) fileData = new Object();
    else fileData = JSON.parse(data);
    fileData[guildId] = songList;
    fs.writeFileSync(
        "song_list.json",
        JSON.stringify(fileData),
        function (err) {
            if (err) throw err;
        }
    );
}

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

function getStatusMessageIdFronJsonFile(guildId) {
    var data;
    try {
        data = fs.readFileSync("status_messages.json");
    } catch (error) { }
    if (data == null || data.length == 0) return null;
    var statusMessagesList = JSON.parse(data);
    return statusMessagesList[guildId];
}

async function getSongTitleFromURL(url) {
    var id = url.substring(
        url.indexOf("?v=") + 3
    );
    if (url.includes("&ab_channel")) {
        id = url.substring(
            url.indexOf("?v=") + 3,
            url.lastIndexOf("&")
        );
    }
    var songTitle;
    try {
        const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=id%2C+snippet&id=${id}&key=${youtube_api_key}`);
        songTitle = response["data"]["items"][0]["snippet"]["title"];
    } catch (error) {
        console.error(error);
    }

    return songTitle;
}

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
    res += songList.song_list.length == 0 ? "No songs in queue" : "\u200B";
    return res;
}
