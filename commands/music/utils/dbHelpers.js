const { Music, MusicQueue } = require('../../../models');
const Sequelize = require('sequelize');
require('dotenv').config();

const db = new Sequelize(process.env.MYSQL_DATABASE, process.env.MYSQL_USER, process.env.MYSQL_PASSWORD, {
    host: "lollipop-db",
    dialect: "mysql",
})

module.exports = {
    insertSongInQueue,
    insertPlaylistInQueue,
    updateCurrentSong,
    getFirstSongInQueue,
    deleteSongInQueue,
    getQueue,
    deleteQueue,
    updateGuildData,
    shuffleQueue,
    getQueueSize,
}

/**
 * Inserts a song into the queue for a specific guild.
 * 
 * @param {string} guildId - The ID of the guild.
 * @param {Object} songParams - The parameters of the song to be inserted.
 * @param {string} songParams.songName - The name of the song.
 * @param {string} songParams.songUrl - The URL of the song.
 * @param {string} songParams.songAuthor - The name of the person who requested the song.
 * @param {string} songParams.songAuthorAvatar - The song author's avatar URL.
 */
function insertSongInQueue(guildId, songParams) {
    db.transaction(t => {
        return MusicQueue.create({
            guildId: guildId,
            songName: songParams.songName,
            songUrl: songParams.songUrl,
            songAuthor: songParams.songAuthor,
            songAuthorAvatar: songParams.songAuthorAvatar
        }, {
            transaction: t
        }
        )
    })
}

/**
 * Inserts a playlist into the queue for a specific guild.
 *
 * @param {string} guildId - The ID of the guild.
 * @param {Array<Object>} playlist - The playlist to insert into the queue.
 * @param {string} playlist[].songName - The name of the song.
 * @param {string} playlist[].songUrl - The URL of the song.
 * @param {string} playlist[].songAuthor - The name of the person who requested the song.
 * @param {string} playlist[].songAuthorAvatar - The song author's avatar URL.
 */
function insertPlaylistInQueue(guildId, playlist) {
    db.transaction(t => {
        return MusicQueue.bulkCreate(playlist, { transaction: t });
    })
}

/**
 * Updates the current song information in the database for a specific guild.
 * 
 * @param {string} guildId - The ID of the guild.
 * @param {Object} songParams - The parameters of the song to update.
 * @param {string} songParams.songName - The name of the song.
 * @param {string} songParams.songUrl - The URL of the song.
 * @param {string} songParams.songAuthor - The name of the person who requested the song.
 * @param {string} songParams.songAuthorAvatar - The song author's avatar URL.
 */
function updateCurrentSong(guildData, songParams) {
    db.transaction(t => {
        return Music.update(
            {
                currentSong: songParams.currentSong,
                currentSongUrl: songParams.currentSongUrl,
                currentSongAuthor: songParams.currentSongAuthor,
                currentSongAuthorAvatar: songParams.songAuthorAvatar
            }, {
            where: {
                guildId: guildId,
            }
        }, {
            transaction: t
        }
        )
    })
}

/**
 * Retrieves the first song in the queue for a specific guild.
 * 
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<Object>} A promise that resolves with the first song in the queue as an object, or rejects with an error.
 */
function getFirstSongInQueue(guildId) {
    return db.transaction(t => {
        return MusicQueue.findOne({
            where: {
                guildId: guildId,
            }
        }, {
            transaction: t
        })
    })
}

/**
 * Deletes the song in the queue for the specified guild.
 *
 * @param {string} guildId - The ID of the guild.
 * @param {string} songId - The ID of the song.
 */
function deleteSongInQueue(guildId, songId) {
    db.transaction(t => {
        return MusicQueue.destroy({
            where: {
                guildId: guildId,
                id: songId,
            }
        }, {
            transaction: t
        })
    })
}

/**
 * Retrieves the queue for a specific guild.
 * 
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<Array<Object>>} - A promise that resolves with an array of queue items.
 */
function getQueue(guildId) {
    return db.transaction(t => {
        return MusicQueue.findAll({
            where: {
                guildId: guildId,
            }
        }, {
            transaction: t
        })
    })
}

/**
 * Deletes the queue for a specific guild.
 * 
 * @param {string} guildId - The ID of the guild.
 */
function deleteQueue(guildId) {
    db.transaction(t => {
        return MusicQueue.destroy({
            where: {
                guildId: guildId
            }
        }, {
            transaction: t
        })
    })
}

/**
 * Updates the guild data in the database.
 *
 * @param {string} guildId - The ID of the guild to update.
 * @param {Object} guildData - The data to update for the guild.
 * @param {string} guildData.statusMessageId - The ID of the status message.
 * @param {string} guildData.currentSong - The current song being played.
 * @param {string} guildData.currentSongUrl - The URL of the current song.
 * @param {string} guildData.currentSongAuthor - The author of the current song.
 * @param {string} guildData.currentSongAuthorAvatar - The avatar of the current song's author.
 */
function updateGuildData(guildId, guildData) {
    db.transaction(t => {
        return Music.update(
            {
                statusMessageId: guildData.statusMessageId,
                currentSong: guildData.currentSong,
                currentSongUrl: guildData.currentSongUrl,
                currentSongAuthor: guildData.currentSongAuthor,
                currentSongAuthorAvatar: guildData.currentSongAuthorAvatar,
            },
            {
                where: { guildId: guildId }
            },
            {
                transaction: t
            });
    })
}

async function shuffleQueue(guildId) {
    db.transaction(async t => {
        const songsInQueue = await MusicQueue.findAll({ where: { guildId: guildId } }, { transaction: t });
        shuffle(songsInQueue);
        await MusicQueue.destroy({ where: { guildId: guildId } }, { transaction: t })
        const newQueue = songsInQueue.map((s => {
            return {
                guildId: s.guildId,
                songName: s.songName,
                songUrl: s.songUrl,
                songAuthor: s.songAuthor,
                songAuthorAvatar: s.songAuthorAvatar,
            }
        }));
        await MusicQueue.bulkCreate(newQueue, { transaction: t });
    })
}

function getQueueSize(guildId) {
    return db.transaction(t => {
        return MusicQueue.count({ where: { guildId: guildId } }, { transation: t });
    })
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}