'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SummonerChampions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      SummonerId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ChampionId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      wins: {
        type: Sequelize.INTEGER
      },
      losses: {
        type: Sequelize.INTEGER
      },
      totalGames: {
        type: Sequelize.INTEGER
      },
      winrate: {
        type: Sequelize.FLOAT
      },
      kills: {
        type: Sequelize.INTEGER
      },
      deaths: {
        type: Sequelize.INTEGER
      },
      assists: {
        type: Sequelize.INTEGER
      },
      kda: {
        type: Sequelize.FLOAT
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
    await queryInterface.dropTable('SummonerChampions');
  }
};