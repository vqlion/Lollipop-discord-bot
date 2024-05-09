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

function insertSongInQueue(guildId, songParams) {
    const db = new sqlite3.Database(database_file);
    db.serialize(() => {
        db.run(`INSERT INTO queue_${guildId} (${Object.keys(queueTableColumns).join(', ')}) VALUES (?, ?, ?, ?)`, [songParams.songName, songParams.songUrl, songParams.songAuthor, songParams.songAuthorAvatar]);
    });
    db.close();
}

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

function updateCurrentSong(guildId, songParams) {
    const db = new sqlite3.Database(database_file);
    db.serialize(() => {
        db.run(`UPDATE ${tableName} SET currentSong = ?, currentSongUrl = ?, currentSongAuthor = ?, currentSongAuthorAvatar = ? WHERE guildId = ?`, [songParams.songName, songParams.songUrl, songParams.songAuthor, songParams.songAuthorAvatar, guildId]);
    });
    db.close();
}

function updateStatusMessageId(guildId, statusMessageId) {
    const db = new sqlite3.Database(database_file);
    db.serialize(() => {
        db.run(`UPDATE ${tableName} SET statusMessageId = ? WHERE guildId = ?`, [statusMessageId, guildId]);
    });
    db.close();
}

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

function deleteFirstSongInQueue(guildId) {
    const db = new sqlite3.Database(database_file);
    db.serialize(() => {
        db.run(`DELETE FROM queue_${guildId} WHERE rowid = (SELECT rowid FROM queue_${guildId} LIMIT 1)`);
    });
    db.close();
}

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

function deleteQueue(guildId) {
    const db = new sqlite3.Database(database_file);
    db.serialize(() => {
        db.run(`DELETE FROM queue_${guildId}`);
        db.run(`UPDATE ${tableName} SET currentSong = NULL, currentSongUrl = NULL, currentSongAuthor = NULL, currentSongAuthorAvatar = NULL WHERE guildId = ?`, [guildId]);
    });
    db.close();
}