const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const UserFile = sequelize.define('UserFile', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
        folderId: {
        type: DataTypes.INTEGER,
        allowNull: true,    // null means file sits in root
        defaultValue: null
    },
    originalName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    storedName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mimetype: {
        type: DataTypes.STRING,
        allowNull: false
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'user_files',
    timestamps: true
});

module.exports = UserFile;