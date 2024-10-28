'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Champions', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true
      },
      name: {
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
    await queryInterface.dropTable('Champions');
  }
};