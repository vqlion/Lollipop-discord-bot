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

let resourceList = new Object();
let songNamesList = new Object();
let nextResourceIsAvailable = true;
var statusChannel, statusThread;
var clientAvatar;
var currentTitle, currentTitleUsername, currentTitleAvatar;
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

        clientAvatar = interaction.client.user.avatarURL();

        var foundStatusChannel = false;
        if (!statusChannel) {
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
        }

        if (!statusThread) {
            statusThread = statusChannel.threads.cache.find(thread => thread.name === "🎵 Song history - Lollipop");
            if (!statusThread) {
                await statusChannel.threads.create({
                    name: "🎵 Song history - Lollipop",
                    autoArchiveDuration: 60,
                }).then((thread) => {
                    statusThread = thread;
                }).catch(console.error);
            }
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

        var stream = await playdl.stream(url);

        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
        });

        if (!player) {
            player = connection.state.subscription.player;
        }

        title = title ?? request;

        if (player.state.status == "playing") {
            pushNewResource(resource, guildId);
            pushNewSongName(title, memberName, memberAvatar, guildId);
            await interaction.editReply(
                `\`${memberName}\` put \`${title}\` in the queue. It is currently at position \`${resourceList[guildId].length}\`.`
            ).then(() => {
                setTimeout(() => { interaction.deleteReply().then().catch(console.error) }, DELETE_REPLY_TIMEOUT);
            }).catch(console.error);
            statusThread.send(`\`${memberName}\` put \`${title}\` in the queue.`)
                .then()
                .catch(console.error);
            setStatusMessage(currentTitle, currentTitleUsername, currentTitleAvatar, guildId, statusMessage);
        } else {
            await interaction.editReply(`Got it! Playing \`${title}\` (asked by \`${memberName}\`)`).then(() => {
                setTimeout(() => { interaction.deleteReply().then().catch(console.error) }, DELETE_REPLY_TIMEOUT);
            }).catch(console.error);
            statusThread.send(`\`${memberName}\` put \`${title}\` in the queue.`)
                .then()
                .catch(console.error);
            currentTitle = title;
            currentTitleUsername = memberName;
            currentTitleAvatar = memberAvatar;
            resetResourceList(guildId);
            player.play(resource);
            setStatusMessage(currentTitle, memberName, memberAvatar, guildId, statusMessage);
        }

        connection.on(
            VoiceConnectionStatus.Disconnected,
            async (oldState, newState) => {
                try {
                    statusMessage.delete().then().catch(console.error);
                    statusMessage = null;
                    connection.destroy();
                    player.stop();
                    resetResourceList(guildId);
                } catch {
                    console.error;
                }
            }
        );

        connection.on(
            VoiceConnectionStatus.Destroyed,
            async (oldState, newState) => {
                try {
                    statusMessage.delete().then().catch(console.error);
                    statusMessage = null;
                    resetResourceList(guildId);
                } catch {
                    console.error;
                }
            }
        )

        player.on("error", (error) => {
            console.error(error);
        });

        player.addListener("stateChange", (oldState, newState) => {
            if (
                nextResourceIsAvailable &&
                newState.status == AudioPlayerStatus.Idle &&
                oldState.status == AudioPlayerStatus.Playing
            ) {
                setStatusMessage("Skipping...", "...", clientAvatar, guildId, statusMessage);
                startNextResourceTimer();
                var [nextResource, nextResourceTitle, nextResourceAuthor, nextResourceAvatar] = getNextResource(guildId);
                if (nextResource) player.play(nextResource);
                currentTitle = nextResourceTitle;
                currentTitleUsername = nextResourceAuthor;
                currentTitleAvatar = nextResourceAvatar;
                if (nextResourceTitle) setStatusMessage(currentTitle, nextResourceAuthor, nextResourceAvatar, guildId, statusMessage);
                else setStatusMessage("Not currently playing", "waiting for new songs", clientAvatar, guildId, statusMessage);
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

        pushNewResource(resource, guildId);
        pushNewSongName(title, author, authorAvatar, guildId);
    }
}

function pushNewResource(resource, guildId) {
    if (guildId in resourceList) {
        resourceList[guildId].push(resource);
    } else {
        resourceList[guildId] = new Array();
        resourceList[guildId].push(resource);
    }
}

function pushNewSongName(song, author, authorAvatar, guildId) {
    if (guildId in songNamesList) {
        songNamesList[guildId].push([song, author, authorAvatar]);
    } else {
        songNamesList[guildId] = new Array();
        songNamesList[guildId].push([song, author, authorAvatar]);
    }
    dumpSongListToJsonFile();
}

function getNextResource(guildId) {
    var res = resourceList[guildId].shift();
    var resInfo = songNamesList[guildId].shift();
    if (!res) return [null, null, null, null];
    var resTitle = resInfo[0];
    var resAuthor = resInfo[1];
    var resAuthorAvatar = resInfo[2];
    dumpSongListToJsonFile();
    return [res, resTitle, resAuthor, resAuthorAvatar];
}

function resetResourceList(guildId) {
    songNamesList[guildId] = new Array();
    resourceList[guildId] = new Array();
    dumpSongListToJsonFile();
}

function startNextResourceTimer() {
    if (!nextResourceIsAvailable) return;
    nextResourceIsAvailable = false;
    setTimeout(() => {
        nextResourceIsAvailable = true;
    }, 100);
}

function dumpSongListToJsonFile() {
    fs.writeFile(
        "song_list.json",
        JSON.stringify(songNamesList),
        function (err) {
            if (err) throw err;
        }
    );
}

function dumpStatusMessageToJsonFile(statusMessageId, guildId) {
    var statusMessagesList;
    var data;
    try {
        data = fs.readFileSync("status_messages.json");
    } catch (error) { }
    if (data == null) statusMessagesList = new Object();
    else statusMessagesList = JSON.parse(data);
    statusMessagesList[guildId] = statusMessageId;
    fs.writeFile(
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
    if (data == null) return null;
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

async function setStatusMessage(currentTitle, author, authorAvatar, guildId, statusMessage) {
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
    var res = ""
    for (let i = 0; i < Math.min(songNamesList[guildId].length, 3); i++) {
        var songTitle = songNamesList[guildId][i][0];
        var songAuthor = songNamesList[guildId][i][1];
        res += `**${songTitle}** - \`${songAuthor}\``
        res += i == Math.min(songNamesList[guildId].length, 3) - 1 ? "" : "\n";
    }
    res += songNamesList[guildId].length > 3 ? "\n**...**" : "\u200B";
    res += songNamesList[guildId].length == 0 ? "No songs in queue" : "\u200B";
    return res;
}
