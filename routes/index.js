const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user');
const UserFile = require('../models/userFile');

//***************************Authentication************************************ */
function requireLogin(req, res, next) {
    if (!req.session.userId) return res.redirect('/login');
    next();
}

//****************************GET()*********************************** */
router.get('/', (req, res) => {
    res.render('index');
});

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.get('/register',(req, res) => {
    res.render('register', { error: null });
});

router.get('/dashboard', requireLogin, async (req, res) => {
    const files = await UserFile.findAll({
        where: { userId: req.session.userId },
        order: [['createdAt', 'DESC']]
    });

    res.render('dashboard', {
        username: req.session.username,
        files
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});
//****************************register post*********************************** */
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. check username not already taken
        const existing = await User.findOne({ where: { username } });
        if (existing) {
            return res.render('register', { error: 'Username already taken.' });
        }

        // 2. hash the password — 10 salt rounds
        const hashed = await bcrypt.hash(password, 10);

        // 3. save user to DB
        await User.create({ username, password: hashed });

        // 4. success → go to login
        res.redirect('/login');

    } catch (err) {
        console.error(err);
        res.render('register', { error: 'Something went wrong.' });
    }
});

//****************************loggin post*********************************** */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. find user in DB
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.render('login', { error: 'Invalid username or password.' });
        }

        // 2. compare submitted password against stored hash
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.render('login', { error: 'Invalid username or password.' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;


        // 3. success → redirect to dashboard
        res.redirect('/dashboard');

    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Something went wrong.' });
    }
});
//****************************Upload post*********************************** */
router.post('/upload', requireLogin, (req, res) => {
    const upload = req.app.locals.upload;

    upload.single('file')(req, res, async (err) => {
        if (err || !req.file) return res.redirect('/dashboard');

        await UserFile.create({
            userId:       req.session.userId,
            originalName: req.file.originalname,
            storedName:   req.file.filename,
            mimetype:     req.file.mimetype,
            size:         req.file.size
        });

        console.log('File uploaded:', req.file);
        res.redirect('/dashboard');
    });
});

module.exports = router;