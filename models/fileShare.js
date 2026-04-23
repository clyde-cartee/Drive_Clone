const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const FileShare = sequelize.define('FileShare', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fileId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // if shared to a specific user by username
    sharedWithUserId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    // unique token for link sharing
    token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    // 'user' = specific user, 'link' = anyone with link
    shareType: {
        type: DataTypes.ENUM('user', 'link'),
        allowNull: false,
        defaultValue: 'link'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true  // null = never expires
    }
}, {
    tableName: 'file_shares',
    timestamps: true
});

module.exports = FileShare;