'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SummonerChampion extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      SummonerChampion.belongsTo(models.Champion);
      SummonerChampion.belongsTo(models.Summoner);
    }

    incrementWin(n) {
      this.set('wins', this.get('wins') + n);
    }

    incrementLoss(n) {
      this.set('losses', this.get('losses') + n);
    }

    incrementKill(n) {
      this.set('kills', this.get('kills') + n);
    }

    incrementDeath(n) {
      this.set('deaths', this.get('deaths') + n);
    }

    incrementAssist(n) {
      this.set('assists', this.get('assists') + n);
    }

    updateTotalGames() {
      this.set('totalGames', this.getDataValue('wins') + this.getDataValue('losses'));
    }

    updateWinrate() {
      if (this.getDataValue('totalGames') === 0) {
        this.set('winrate', null);
        return;
      }
      this.set('winrate', (this.getDataValue('wins') / this.getDataValue('totalGames') * 100));
    }

    updateKda() {
      const kda = this.get('deaths') !== 0 ? ((this.get('kills') + this.get('assists')) / this.get('deaths')) : this.get('kills') + this.get('assists');
      this.set('kda', kda);
    }
  }
  SummonerChampion.init({
    SummonerId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: sequelize.models.Summoner,
        key: 'id'
      }
    },
    ChampionId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: sequelize.models.Champion,
        key: 'id'
      }
    },
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
    kills: { 
      type: DataTypes.INTEGER,
      defaultValue: 0,
      set(value) {
        this.setDataValue('kills', value);
        this.updateKda();
      }
    },
    deaths: { 
      type: DataTypes.INTEGER,
      defaultValue: 0,
      set(value) {
        this.setDataValue('deaths', value);
        this.updateKda();
      }
    },
    assists: { 
      type: DataTypes.INTEGER,
      defaultValue: 0,
      set(value) {
        this.setDataValue('assists', value);
        this.updateKda();
      }
    },
    kda: { type: DataTypes.FLOAT, defaultValue: null },
  }, {
    sequelize,
    modelName: 'SummonerChampion',
  });
  return SummonerChampion;
};