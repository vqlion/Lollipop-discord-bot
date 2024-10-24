'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Summoner extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Summoner.init({
    summonerId: DataTypes.STRING,
    riotIdGameName: DataTypes.STRING,
    wins: DataTypes.INTEGER,
    losses: DataTypes.INTEGER,
    totalGames: DataTypes.INTEGER,
    winrate: DataTypes.FLOAT,
    kills: DataTypes.INTEGER,
    deaths: DataTypes.INTEGER,
    assists: DataTypes.INTEGER,
    kda: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'Summoner',
  });
  return Summoner;
};