const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const Folder = sequelize.define('Folder', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'folders',
    timestamps: true
});

module.exports = Folder;