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
const { youtube_api_key, spotify_client_id, spotify_client_secret } = require('../../config.json')

var clientAvatar; // Avatar (profile picture) of the bot
let nextResourceIsAvailable = true;
const DELETE_REPLY_TIMEOUT = 5000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play any song or playlist from Youtube, or playlist from Deezer or Spotify")
        .addStringOption((option) =>
            option
                .setName("song")
                .setDescription("The song/playlist you want to play")
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
            return returnErrorMessageToUser(interaction, "You must be in a voice channel to perform this command.");
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
            return returnErrorMessageToUser(interaction, "You must be in the same voice channel as the bot to perform this command.");
        }

        /**
         * There begins the handling of the request, treating all possible cases.
         * Not an url, youtube playlist, deezer playlist/album, spotify playlisty/album
         * The goal of each of these is just to get the title and youtube url of the video, which will then be used to actually play the music.
         */

        var url = request;
        var title = null;

        var playlistInfo, playlistVideosInfo, playlistTitle;
        var playlistSongTitles = [];
        var requestIsPLaylist = false;
        var requestIsYoutubePlaylist = false;

        // Not an url, search the video on youtube from the request with playdl to get url and title
        if (!isValidHttpUrl(request)) {
            var youtubeVideoInfo = await playdl.search(request, { limit: 1 });
            if (youtubeVideoInfo.length == 0) {
                return returnErrorMessageToUser(interaction, "Couldn't find any video matching your request.");
            }
            url = youtubeVideoInfo[0].url;
            title = youtubeVideoInfo[0].title;

            // Youtube video url, just fetch the title to show it to the user, we'll use the url directly to play the music
        } else if (isYoutubeVideoUrl(request)) {
            title = await getYoutubeVideoTitleFromUrl(url);
            if (!title) {
                return returnErrorMessageToUser(interaction, "Couldn't find any video matching your request.");
            }

            // Youtube playlist url, get all the songs with playdl from the url and push their titles and urls to the list
        } else if (isYoutubePlaylistUrl(request)) {
            requestIsPLaylist = true;
            requestIsYoutubePlaylist = true;
            try {
                playlistInfo = await playdl.playlist_info(request, { incomplete: true });
            } catch (error) {
                return returnErrorMessageToUser(interaction, "Couldn't find any playlist matching your request.");
            }
            playlistVideosInfo = await playlistInfo.all_videos();

            url = playlistVideosInfo[0].url;
            title = playlistVideosInfo[0].title;
            playlistTitle = playlistInfo.title + ' (Youtube playlist)';
            // the first song is either gonna be played now or added to the list below
            // so remove it to not have it duplicated
            playlistVideosInfo.shift();

            // Deezer playlist url, get all the songs with the deezer api to fetch their titles 
            // Then look for their Youtube URL with playdl (looking from title) and put the titles and urls in the list
        } else if (isDeezerPlaylistUrl(request)) {
            requestIsPLaylist = true;
            playlistInfo = await getDeezerPlaylistInfoFromUrl(url);
            if (!playlistInfo) return returnErrorMessageToUser(interaction, "Couldn't find any playlist matching your request");
            playlistTitle = playlistInfo.title + ' (Deezer playlist)';

            /**
             * Here we fetch the song titles and artist name and format them ({title} - {artist})
             * These strings will then be used to look for a video matching the song on youtube
             */
            const playlistSongInfos = playlistInfo.tracks.data;
            playlistSongTitles = [];
            for (index in playlistSongInfos) {
                playlistSongTitles.push(`${playlistSongInfos[index].title} - ${playlistSongInfos[index].artist.name}`);
            }

            /**
             * Get the first song information to play it instantly. 
             * This allows for later computation of the rest of the videos (because it takes a lot of time)
             * That way the users don't have to wait 30 seconds for the playlist to start 
             * Basically the bot plays the first song and computes the rest of the playlist in the background
             * This pattern repeats for every playlist/album from now on.
             */
            var firstYoutubeVideoInfo = await getFirstYoutubeVideoInfo(playlistSongTitles);
            if (!firstYoutubeVideoInfo) return returnErrorMessageToUser(interaction, "Couldn't find any playlist matching your request");
            url = firstYoutubeVideoInfo[0].url;
            title = firstYoutubeVideoInfo[0].title;

            // Deezer album is similar to Deezer playlist
        } else if (isDeezerAlbumUrl(request)) {
            requestIsPLaylist = true;
            playlistInfo = await getDeezerAlbumInfoFromUrl(url);
            if (!playlistInfo) return returnErrorMessageToUser(interaction, "Couldn't find any album matching your request.");

            playlistTitle = playlistInfo.title + ' - ' + playlistInfo.artist.name;

            const playlistSongInfos = playlistInfo.tracks.data;
            playlistSongTitles = [];
            for (index in playlistSongInfos) {
                playlistSongTitles.push(`${playlistSongInfos[index].title} - ${playlistSongInfos[index].artist.name}`);
            }

            var firstYoutubeVideoInfo = await getFirstYoutubeVideoInfo(playlistSongTitles);
            if (!firstYoutubeVideoInfo) return returnErrorMessageToUser(interaction, "Couldn't find any album matching your request");
            url = firstYoutubeVideoInfo[0].url;
            title = firstYoutubeVideoInfo[0].title;

            // Spotify playlist is similar to Deezer playlist
        } else if (isSpotifyPlaylistUrl(request)) {
            requestIsPLaylist = true;
            playlistInfo = await getSpotifyPlaylistInfoFromUrl(url);
            if (!playlistInfo) return returnErrorMessageToUser(interaction, "Couldn't find any playlist matching your request");
            playlistTitle = playlistInfo.name + ' (Spotify playlist)';
            
            const playlistSongInfos = playlistInfo.tracks.items;
            playlistSongTitles = [];
            for (index in playlistSongInfos) {
                var spotifyTrackName = playlistSongInfos[index].track.name;
                var spotifyTrackArtist = playlistSongInfos[index].track.artists[0].name;
                playlistSongTitles.push(`${spotifyTrackName} - ${spotifyTrackArtist}`);
            }

            var firstYoutubeVideoInfo = await getFirstYoutubeVideoInfo(playlistSongTitles);
            if (!firstYoutubeVideoInfo) return returnErrorMessageToUser(interaction, "Couldn't find any playlist matching your request");
            url = firstYoutubeVideoInfo[0].url;
            title = firstYoutubeVideoInfo[0].title;
            
            // Spotify album is similar to Deezer playlist
        } else if (isSpotifyAlbumUrl(request)) {
            requestIsPLaylist = true;
            playlistInfo = await getSpotifyAlbumInfoFromUrl(url);
            if (!playlistInfo) return returnErrorMessageToUser(interaction, "Couldn't find any album matching your request");
            playlistTitle = playlistInfo.name + ' - ' + playlistInfo.artists[0].name;

            const playlistSongInfos = playlistInfo.tracks.items;
            playlistSongTitles = [];
            for (index in playlistSongInfos) {
                var spotifyTrackName = playlistSongInfos[index].name;
                var spotifyTrackArtist = playlistSongInfos[index].artists[0].name;
                playlistSongTitles.push(`${spotifyTrackName} - ${spotifyTrackArtist}`);
            }

            var firstYoutubeVideoInfo = await getFirstYoutubeVideoInfo(playlistSongTitles);
            if (!firstYoutubeVideoInfo) return returnErrorMessageToUser(interaction, "Couldn't find any playlist matching your request");
            url = firstYoutubeVideoInfo[0].url;
            title = firstYoutubeVideoInfo[0].title;

        } else {
            return returnErrorMessageToUser(interaction, "Couldn't find anything matching your request");
        }

        if (!player) {
            player = connection.state.subscription.player;
        }

        title = title ?? request;

        /**
         * This part adds the songs to the list or plays it, responds to the user, updates the status thread and the status message.
         * If the bot is playing -> adds the song to the queue 
         * If the bot isn't playing -> plays the song
         */
        if (player.state.status == "playing") { // the bot is already playing something, add the song to the queue
            pushNewSongName(title, memberName, memberAvatar, url, guildId);

            await interaction.editReply(
                `\`${memberName}\` put \`${playlistTitle ?? title}\` in the queue. It is currently at position \`${getSongListFromJsonFile(guildId).song_list.length}\`.`
            ).then(() => {
                setTimeout(() => { interaction.deleteReply().then().catch(console.error) }, DELETE_REPLY_TIMEOUT);
            }).catch(console.error);

            statusThread.send(`\`${memberName}\` put \`${playlistTitle ?? title}\` in the queue.`)
                .then()
                .catch(console.error);

            [currentTitle, currentTitleUsername, currentTitleAvatar] = getCurrentSongName(guildId);
            setStatusMessage(currentTitle, currentTitleUsername, currentTitleAvatar, guildId, statusMessage, statusChannel);
        } else {
            await interaction.editReply(`Got it! Playing \`${playlistTitle ?? title}\` (asked by \`${memberName}\`)`).then(() => {
                setTimeout(() => { interaction.deleteReply().then().catch(console.error) }, DELETE_REPLY_TIMEOUT);
            }).catch(console.error);

            statusThread.send(`\`${memberName}\` put \`${playlistTitle ?? title}\` in the queue.`)
                .then()
                .catch(console.error);

            if (!isPlaylistUrl(request)) resetResourceList(guildId);
            pushCurrentSongName(title, memberName, memberAvatar, guildId);

            var stream = await playdl.stream(url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
            });
            player.play(resource);
            setStatusMessage(title, memberName, memberAvatar, guildId, statusMessage, statusChannel);
        }

        // delayed adding the playlist songs to the list because it takes a bit of time
        // that way the bot can answer to the interaction before it times out
        if (requestIsPLaylist) {
            if (!requestIsYoutubePlaylist) playlistVideosInfo = await getYoutubeVideoListFromTitles(playlistSongTitles);
            pushPlayListToSongList(playlistVideosInfo, memberName, memberAvatar, guildId);
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
 * Sends an error message to the user and deletes it after a timeout.
 * 
 * @param {Interaction} interaction - The interaction object representing the user's interaction with the bot.
 * @param {string} errorMessage - The error message to send to the user.
 * @returns {Promise<void>} A promise that resolves after the error message is sent and deleted.
 */
function returnErrorMessageToUser(interaction, errorMessage) {
    return interaction.editReply(errorMessage).then(() => {
        setTimeout(() => { interaction.deleteReply().then().catch(console.error) }, DELETE_REPLY_TIMEOUT);
    }).catch(console.error);
}

/**
 * Checks if a given string is a valid HTTP or HTTPS URL.
 *
 * @param {string} string The string to be checked.
 * @returns {boolean} true if the string is a valid HTTP or HTTPS URL, false otherwise.
 */
function isValidHttpUrl(string) {
    let url;
    try {
        url = new URL(string);
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
 * Checks if a given URL is a YouTube video URL.
 * 
 * @param {string} url - The URL to check.
 * @returns {boolean} - Returns true if the URL is a YouTube video URL, otherwise returns false.
 */
function isYoutubeVideoUrl(url) {
    return url.match('^https:\/\/www\.youtube\.com\/watch.*');
}

/**
 * Checks if a given URL is a YouTube playlist URL.
 * 
 * @param {string} url - The URL to check.
 * @returns {boolean} - Returns true if the URL is a YouTube playlist URL, otherwise returns false.
 */
function isYoutubePlaylistUrl(url) {
    return url.match('^https:\/\/www\.youtube\.com\/playlist.*');
}

/**
 * Checks if the given URL is a Deezer playlist URL.
 * 
 * @param {string} url - The URL to check.
 * @returns {boolean} - Returns true if the URL is a Deezer playlist URL, otherwise returns false.
 */
function isDeezerPlaylistUrl(url) {
    return url.match('^https:\/\/www\.deezer\.com\/.*\/playlist\/.*$');
}
/**
 * Checks if the given URL is a Deezer album URL.
 * 
 * @param {string} url - The URL to check.
 * @returns {boolean} - Returns true if the URL is a Deezer album URL, otherwise returns false.
 */
function isDeezerAlbumUrl(url) {
    return url.match('^https:\/\/www\.deezer\.com\/.*\/album\/.*$');
}

/**
 * Checks if the given URL is a Spotify playlist URL.
 * 
 * @param {string} url - The URL to check.
 * @returns {boolean} - Returns true if the URL is a Spotify playlist URL, otherwise returns false.
 */
function isSpotifyPlaylistUrl(url) {
    return url.match('^https:\/\/open\.spotify\.com\/playlist\/.*$');
}

/**
 * Checks if the given URL is a Spotify album URL.
 * 
 * @param {string} url - The URL to check.
 * @returns {boolean} - Returns true if the URL is a Spotify album URL, otherwise returns false.
 */
function isSpotifyAlbumUrl(url) {
    return url.match('^https:\/\/open\.spotify\.com\/album\/.*$');
}

/**
 * Retrieves the video's title from a YouTube URL. Assumes a valid Youtube video url.
 * 
 * @param {string} url - The YouTube URL.
 * @returns {Promise<string>} The song title.
 */
async function getYoutubeVideoTitleFromUrl(url) {
    const videoId = url.match('\\?v=(.*?)(&|$)')[1];
    var songTitle;
    try {
        const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=id%2C+snippet&id=${videoId}&key=${youtube_api_key}`);
        songTitle = response["data"]["items"][0]["snippet"]["title"]; // sorry about that
    } catch (error) {
        console.error(error);
    }

    return songTitle;
}

/**
 * Retrieves information about a Deezer playlist from a given URL.
 * 
 * @param {string} url - The Deezer playlist URL.
 * @returns {Promise<Object|null>} - A Promise that resolves to the playlist information object, or null if an error occurs.
 */
async function getDeezerPlaylistInfoFromUrl(url) {
    const playlistId = url.match('^https:\/\/www\.deezer\.com\/.*\/playlist\/(.*?)(\/|&|\\?|$)')[1];
    var response;
    try {
        response = await axios.get(`https://api.deezer.com/playlist/${playlistId}`);
        if (response['data']['error']) return null;
    } catch (error) {
        console.error(error);
    }
    return response ? response['data'] : null;
}

/**
 * Retrieves information about a Deezer album from a given URL.
 * 
 * @param {string} url - The Deezer album URL.
 * @returns {Promise<Object|null>} - A Promise that resolves to the album information object, or null if an error occurs.
 */
async function getDeezerAlbumInfoFromUrl(url) {
    const albumId = url.match('^https:\/\/www\.deezer\.com\/.*\/album\/(.*?)(\/|&|$)')[1];
    var response;
    try {
        response = await axios.get(`https://api.deezer.com/album/${albumId}`);
        if (response['data']['error']) return null;
    } catch (error) {
        console.error(error);
    }
    return response ? response['data'] : null;
}

/**
 * Retrieves the access token for Spotify API.
 * 
 * @returns {string|null} The access token or null if an error occurred.
 */
async function getSpotifyAccessToken() {
    var response;
    try {
        response = await axios.post('https://accounts.spotify.com/api/token',
            `grant_type=client_credentials&client_id=${spotify_client_id}&client_secret=${spotify_client_secret}`, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        if (response.status != 200) return null;
    } catch (error) {
        console.error(error);
    }
    return response ? response['data']['access_token'] : null;
}

/**
 * Retrieves information about a Spotify playlist from a given URL.
 * 
 * @param {string} url - The Spotify playlist URL.
 * @returns {Promise<Object|null>} - A Promise that resolves to the playlist information object, or null if an error occurs.
 */
async function getSpotifyPlaylistInfoFromUrl(url) {
    const playlistId = url.match('^https:\/\/open\.spotify\.com\/playlist\/(.*?)(\/|&|\\?|$)')[1];
    const accessToken = await getSpotifyAccessToken();
    var response;
    try {
        response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.status != 200) return null;
    } catch (error) {
        console.error(error);
    }
    return response ? response['data'] : null;
}

/**
 * Retrieves information about a Spotify album from a given URL.
 * 
 * @param {string} url - The Spotify album URL.
 * @returns {Promise<Object|null>} - A Promise that resolves to the album information object, or null if an error occurs.
 */
async function getSpotifyAlbumInfoFromUrl(url) {
    const albumId = url.match('^https:\/\/open\.spotify\.com\/album\/(.*?)(\/|&|\\?|$)')[1];
    const accessToken = await getSpotifyAccessToken();
    var response;
    try {
        response = await axios.get(`https://api.spotify.com/v1/albums/${albumId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.status != 200) return null;
    } catch (error) {
        console.error(error);
    }
    return response ? response['data'] : null;
}

/**
 * Retrieves a list of YouTube video information based on the given titles.
 * 
 * @param {string[]} titles - An array of video titles to search for.
 * @returns {Promise<playdl.YouTubeVideo[]>} - A promise that resolves to an array of YouTube video information objects.
 */
async function getYoutubeVideoListFromTitles(titles) {
    var tmp = [];
    for (index in titles) {
        var youtubeVideoInfo = await playdl.search(titles[index], { limit: 1 });
        if (youtubeVideoInfo.length == 0) continue;
        tmp.push(youtubeVideoInfo[0]);
    }
    return tmp;
}

/**
 * Retrieves the information of the first YouTube video from the given playlist song titles.
 * 
 * @param {string[]} playlistSongTitles - The array of playlist song titles.
 * @returns {Promise<playdl.YouTubeVideo[]>} - A promise that resolves to an array of YouTube video information.
 */
async function getFirstYoutubeVideoInfo(playlistSongTitles) {
    var searchValidVideoIndex = 0;
    var firstYoutubeVideoInfo = await playdl.search(playlistSongTitles[searchValidVideoIndex], { limit: 1 });
    playlistSongTitles.shift();
    while (firstYoutubeVideoInfo.length == 0) {
        searchValidVideoIndex++;
        if (searchValidVideoIndex == playlistSongTitles.length - 1) return null;
        firstYoutubeVideoInfo = await playdl.search(playlistSongTitles[searchValidVideoIndex], { limit: 1 });
        playlistSongTitles.shift();
    }
    return firstYoutubeVideoInfo;
}

/**
 * Adds the songs from the songList to the queue. Used to add an entire playlist.
 *
 * @param {Array.<playdl.YouTubeVideo>} playlist - The list of songs to be added to the queue.
 * @param {string} author - The name of the person who added the songs.
 * @param {string} authorAvatar - The profile picture URL of the author.
 * @param {string} guildId - The ID of the guild where the songs are being added.
 * @returns {void}
 */
async function pushPlayListToSongList(playlist, author, authorAvatar, guildId) {
    var songList = getSongListFromJsonFile(guildId);
    for (entry in playlist) {
        var url = playlist[entry].url;
        var title = playlist[entry].title;
        songList.song_list.push([title, author, authorAvatar, url]);
    }
    dumpSongListToJsonFile(songList, guildId);
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
 * @returns {Array.<string>} [song, author, authorAvatar]
 */
function getCurrentSongName(guildId) {
    const songList = getSongListFromJsonFile(guildId);
    return songList.current_song;
}

/**
 * Retrieves the next resource from the song list for the specified guild.
 * 
 * @param {string} guildId - The ID of the guild.
 * @returns {Array.<string>} An array containing the resource URL, the song title, the author and the author's avatar URL for the next song.
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
 * @param {Array.<Object>} songList - The list of songs to be dumped to the JSON file.
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
