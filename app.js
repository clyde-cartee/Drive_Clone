const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const port = 8000;

const indexRouter = require('./routes/index');
const sequelize = require('./utils/sequelize');
const users = require('./models/user');
const UserFile = require('./models/userFile');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'drive-clone-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public/uploads'));
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
app.locals.upload = upload;

app.set('views', path.join(__dirname, "views"));
app.set('view engine', 'pug');

app.use('/', indexRouter );

sequelize.authenticate()
    .then(() => {
        console.log("Successfully authenticated.");
        return sequelize.sync();            
    })
    .then(() => {
        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    })
    .catch((err) => {
        console.log("Could not authenticate: ", err);
    });