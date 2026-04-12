const Sequelize = require('sequelize');
const sequelize = new Sequelize('my_carteec2_Drive','my.carteec2', '44772%03', {
    host: '127.0.0.1',
    port: 3307, // I had issues with 3306
    dialect: 'mysql'
});

module.exports = sequelize;