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
    updateGuildData
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
            });
    })
}