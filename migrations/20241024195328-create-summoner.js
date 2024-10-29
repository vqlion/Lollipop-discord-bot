'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Summoners', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true
      },
      riotIdGameName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      wins: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      losses: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      totalGames: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      winrate: {
        type: Sequelize.FLOAT,
        defaultValue: null
      },
      kills: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      deaths: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      assists: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      kda: {
        type: Sequelize.FLOAT,
        defaultValue: null
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
    await queryInterface.dropTable('Summoners');
  }
};