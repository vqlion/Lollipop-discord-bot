const sqlite3 = require("sqlite3");
const { database_file } = require('../../../config.json')

const tableName = 'music'

const musicTableColumns = {
    guildId: 'guildId TEXT PRIMARY KEY',
    statusMessageId: 'statusMessageId TEXT',
    currentSong: 'currentSong TEXT',
    currentSongUrl: 'currentSongUrl TEXT',
    currentSongAuthor: 'currentSongAuthor TEXT',
    currentSongAuthorAvatar: 'currentSongAuthorAvatar TEXT'
}

const queueTableColumns = {
    songName: 'songName TEXT',
    songUrl: 'songUrl TEXT',
    songAuthor: 'songAuthor TEXT',
    songAuthorAvatar: 'songAuthorAvatar TEXT'
}

module.exports = {
    insertSongInQueue,
    insertPlaylistInQueue,
    insertNewGuild,
    updateCurrentSong,
    updateStatusMessageId,
    getGuildData,
    getFirstSongInQueue,
    deleteFirstSongInQueue,
    getQueue,
    deleteQueue
}

/**
 * Inserts a new guild into the database.
 * It creates the music table if it doesn't exist, inserts the guild ID, and creates a queue table for the guild.
 * 
 * @param {string} guildId - The ID of the guild to insert.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
function insertNewGuild(guildId) {
    const db = new sqlite3.Database(database_file);
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (${Object.values(musicTableColumns).join(', ')})`);
        db.run(`INSERT OR IGNORE INTO ${tableName} (guildId) VALUES (?)`, [guildId]);
        db.run(`CREATE TABLE IF NOT EXISTS queue_${guildId} (${Object.values(queueTableColumns).join(', ')})`);
    });
    db.close((err) => {
        return new Promise((resolve, reject) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
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
    const db = new sqlite3.Database(database_file);
    db.serialize(() => {
        db.run(`INSERT INTO queue_${guildId} (${Object.keys(queueTableColumns).join(', ')}) VALUES (?, ?, ?, ?)`, [songParams.songName, songParams.songUrl, songParams.songAuthor, songParams.songAuthorAvatar]);
    });
    db.close();
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
    const db = new sqlite3.Database(database_file);
    const playlistPlaceholder = playlist.map(() => '(?, ?, ?, ?)').join(', ');
    const playlistValues = playlist.reduce((acc, song) => {
        acc.push(song.songName, song.songUrl, song.songAuthor, song.songAuthorAvatar);
        return acc;
    }, []);
    db.serialize(() => {
        db.run(`INSERT INTO queue_${guildId} (${Object.keys(queueTableColumns).join(', ')}) VALUES ${playlistPlaceholder}`, playlistValues);
    });
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
function updateCurrentSong(guildId, songParams) {
    const db = new sqlite3.Database(database_file);
    db.serialize(() => {
        db.run(`UPDATE ${tableName} SET currentSong = ?, currentSongUrl = ?, currentSongAuthor = ?, currentSongAuthorAvatar = ? WHERE guildId = ?`, [songParams.songName, songParams.songUrl, songParams.songAuthor, songParams.songAuthorAvatar, guildId]);
    });
    db.close();
}

/**
 * Updates the status message ID for a guild in the database.
 * 
 * @param {string} guildId - The ID of the guild.
 * @param {string} statusMessageId - The ID of the status message.
 */
function updateStatusMessageId(guildId, statusMessageId) {
    const db = new sqlite3.Database(database_file);
    db.serialize(() => {
        db.run(`UPDATE ${tableName} SET statusMessageId = ? WHERE guildId = ?`, [statusMessageId, guildId]);
    });
    db.close();
}

/**
 * Retrieves guild data from the database based on the provided guild ID.
 *
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<Object>} - A promise that resolves with the retrieved guild data as an object.
 */
function getGuildData(guildId) {
    const db = new sqlite3.Database(database_file);
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.get(`SELECT * FROM ${tableName} WHERE guildId = ?`, [guildId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    });
}

/**
 * Retrieves the first song in the queue for a specific guild.
 * 
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<Object>} A promise that resolves with the first song in the queue as an object, or rejects with an error.
 */
function getFirstSongInQueue(guildId) {
    const db = new sqlite3.Database(database_file);
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM queue_${guildId} LIMIT 1`, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * Deletes the first song in the queue for the specified guild.
 *
 * @param {string} guildId - The ID of the guild.
 */
function deleteFirstSongInQueue(guildId) {
    const db = new sqlite3.Database(database_file);
    db.serialize(() => {
        db.run(`DELETE FROM queue_${guildId} WHERE rowid = (SELECT rowid FROM queue_${guildId} LIMIT 1)`);
    });
    db.close();
}

/**
 * Retrieves the queue for a specific guild.
 * 
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<Array<Object>>} - A promise that resolves with an array of queue items.
 */
function getQueue(guildId) {
    const db = new sqlite3.Database(database_file);
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM queue_${guildId}`, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Deletes the queue for a specific guild.
 * 
 * @param {string} guildId - The ID of the guild.
 */
function deleteQueue(guildId) {
    const db = new sqlite3.Database(database_file);
    db.serialize(() => {
        db.run(`DELETE FROM queue_${guildId}`);
        db.run(`UPDATE ${tableName} SET currentSong = NULL, currentSongUrl = NULL, currentSongAuthor = NULL, currentSongAuthorAvatar = NULL WHERE guildId = ?`, [guildId]);
    });
    db.close();
}