const express = require('express');
const app = express();
const path = require('path');
const port = 8000;

const indexRouter = require('./routes/index');

const sequelize = require('./utils/sequelize');
const userFile = require('./models/userFile');

app.use('/',express.static('public'));

app.set('views', path.join(__dirname, "views"));
app.set('view engine', 'pug');

app.use('/', indexRouter );

sequelize.authenticate()
    .then(()=>{
        console.log("Successful authenticated.");
        app.listen(port);
    })
    .catch((err) => {
        console.log("could not authenticate: ", err);
    });