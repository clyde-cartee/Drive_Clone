const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const User = require('../models/user');
const UserFile = require('../models/userFile');
const Folder = require('../models/folder');


//***************************Authentication************************************ */
function requireLogin(req, res, next) {
    if (!req.session.userId) return res.redirect('/login');
    next();
}

//****************************{/,login,register,logout}GET()*********************************** */
router.get('/', (req, res) => {
    res.render('index');
});

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.get('/register',(req, res) => {
    res.render('register', { error: null });
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});
//****************************/DashboardGET()*********************************** */
router.get('/dashboard', requireLogin, async (req, res) => {
    const folderId = req.query.folder ? parseInt(req.query.folder) : null;

    const folders = await Folder.findAll({
        where: { userId: req.session.userId },
        order: [['name', 'ASC']]
    });

    const fileQuery = {
        userId: req.session.userId,
        folderId: folderId  // null shows root files, id shows folder files
    };

    const files = await UserFile.findAll({
        where: fileQuery,
        order: [['createdAt', 'DESC']]
    });

    // find current folder name if inside one
    const currentFolder = folderId
        ? folders.find(f => f.id === folderId)
        : null;

    res.render('dashboard', {
        username: req.session.username,
        files,
        folders,
        currentFolder,
        folderId
    });
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
    const folderId = req.query.folder || null;

    upload.single('file')(req, res, async (err) => {
        if (err || !req.file) return res.redirect('/dashboard');

        await UserFile.create({
            userId:       req.session.userId,
            folderId:     folderId,
            originalName: req.file.originalname,
            storedName:   req.file.filename,
            mimetype:     req.file.mimetype,
            size:         req.file.size
        });

        res.redirect('/dashboard' + (folderId ? `?folder=${folderId}` : ''));
    });
});

//****************************File view*********************************** */
router.get('/file/:id', requireLogin, async (req, res) => {
    try {
        const file = await UserFile.findOne({
            where: {
                id: req.params.id,
                userId: req.session.userId
            }
        });

        if (!file) return res.status(404).send('File not found.');

        const filePath = path.join(__dirname, '../public/uploads', file.storedName);
        res.setHeader('Content-Type', file.mimetype);
        fs.createReadStream(filePath).pipe(res);

    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

//****************************Download*********************************** */
router.get('/download/:id', requireLogin, async (req, res) => {
    try {
        const file = await UserFile.findOne({
            where: {
                id: req.params.id,
                userId: req.session.userId
            }
        });

        if (!file) return res.status(404).send('File not found.');

        const filePath = path.join(__dirname, '../public/uploads', file.storedName);
        res.download(filePath, file.originalName);

    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

//****************************Delete*********************************** */
router.post('/delete/:id', requireLogin, async (req, res) => {
    try {
        const file = await UserFile.findOne({
            where: {
                id: req.params.id,
                userId: req.session.userId
            }
        });

        if (!file) return res.status(404).send('File not found.');

        const filePath = path.join(__dirname, '../public/uploads', file.storedName);
        fs.unlink(filePath, (err) => {
            if (err) console.error('Could not delete file from disk:', err);
        });

        await file.destroy();
        res.redirect('/dashboard');

    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

//****************************POST /folder/create***************************** */
router.post('/folder/create', requireLogin, async (req, res) => {
    const { name } = req.body;
    const redirectFolder = req.query.folder || '';

    try {
        await Folder.create({
            userId: req.session.userId,
            name: name.trim()
        });
    } catch (err) {
        console.error(err);
    }

    res.redirect('/dashboard' + (redirectFolder ? `?folder=${redirectFolder}` : ''));
});
//****************************Move file to folder***************************** */
router.post('/file/move/:id', requireLogin, async (req, res) => {
    const { folderId } = req.body;
    const redirectFolder = req.query.folder || '';

    try {
        const file = await UserFile.findOne({
            where: {
                id: req.params.id,
                userId: req.session.userId
            }
        });

        if (!file) return res.status(404).send('File not found.');

        // null moves file back to root
        file.folderId = folderId === 'null' ? null : parseInt(folderId);
        await file.save();

    } catch (err) {
        console.error(err);
    }

    res.redirect('/dashboard' + (redirectFolder ? `?folder=${redirectFolder}` : ''));
});

//****************************Delete folder*********************************** */
router.post('/folder/delete/:id', requireLogin, async (req, res) => {
    try {
        const folder = await Folder.findOne({
            where: {
                id: req.params.id,
                userId: req.session.userId
            }
        });

        if (!folder) return res.status(404).send('Folder not found.');

        // move all files in folder back to root before deleting
        await UserFile.update(
            { folderId: null },
            { where: { folderId: folder.id, userId: req.session.userId } }
        );

        await folder.destroy();
        res.redirect('/dashboard');

    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

module.exports = router;