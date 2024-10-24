'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MusicQueue extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  MusicQueue.init({
    guildId: DataTypes.STRING,
    songName: DataTypes.STRING,
    songUrl: DataTypes.STRING,
    songAuthor: DataTypes.STRING,
    songAuthorAvatar: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'MusicQueue',
  });
  return MusicQueue;
};