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
  }
  Champion.init({
    championId: DataTypes.STRING,
    name: DataTypes.STRING,
    wins: DataTypes.INTEGER,
    losses: DataTypes.INTEGER,
    totalGames: DataTypes.INTEGER,
    winrate: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'Champion',
  });
  return Champion;
};