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
    },
    parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,    // null = root level folder
        defaultValue: null
    }
}, {
    tableName: 'folders',
    timestamps: true
});

module.exports = Folder;