'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Champion extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    incrementWin(n) {
      this.set('wins', this.get('wins') + n);
    }

    incrementLoss(n) {
      this.set('losses', this.get('losses') + n);
    }

    updateTotalGames() {
      this.set('totalGames', this.getDataValue('wins') + this.getDataValue('losses'));
    }

    updateWinrate() {
      this.set('winrate', (this.getDataValue('wins') / this.getDataValue('totalGames') * 100));
    }
  }
  Champion.init({
    championId: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    wins: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      set(value) {
        this.setDataValue('wins', value);
        this.updateTotalGames();
        this.updateWinrate();
      }
    },
    losses: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      set(value) {
        this.setDataValue('losses', value);
        this.updateTotalGames();
        this.updateWinrate();
      }
    },
    totalGames: { type: DataTypes.INTEGER, defaultValue: 0 },
    winrate: { type: DataTypes.FLOAT, defaultValue: null },
  }, {
    sequelize,
    modelName: 'Champion',
  });
  return Champion;
};