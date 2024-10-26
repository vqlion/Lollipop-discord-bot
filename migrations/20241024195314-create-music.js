'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Music', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      guildId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      statusMessageId: {
        type: Sequelize.STRING
      },
      currentSong: {
        type: Sequelize.STRING
      },
      currentSongUrl: {
        type: Sequelize.STRING
      },
      currentSongAuthor: {
        type: Sequelize.STRING
      },
      currentSongAuthorAvatar: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Music');
  }
};