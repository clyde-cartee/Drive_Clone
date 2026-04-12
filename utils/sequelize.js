const Sequelize = require('sequelize');
const sequelize = new Sequelize('my_carteec2_Drive','my.carteec2', 'ThisSequel2026', {
    host: '127.0.0.1',
    dialect: 'mysql'
});

module.exports = sequelize;