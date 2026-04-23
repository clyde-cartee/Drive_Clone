const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const User = require('../models/user');
const UserFile = require('../models/userFile');
const Folder = require('../models/folder');
const FileShare = require('../models/fileShare');
const { Op } = require('sequelize');


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

// build nested tree from flat array
function buildTree(folders, parentId = null) {
    return folders
        .filter(f => f.parentId === parentId)
        .map(f => ({
            ...f.dataValues,
            children: buildTree(folders, f.id)
        }));
}

router.get('/dashboard', requireLogin, async (req, res) => {
    const folderId = req.query.folder ? parseInt(req.query.folder) : null;

    const folders = await Folder.findAll({
        where: { 
            userId: req.session.userId,
            parentId: folderId
         },
        order: [['name', 'ASC']]
    });

    const allFolders = await Folder.findAll({
        where: { userId: req.session.userId },
        order: [['name', 'ASC']]
    });

    const files = await UserFile.findAll({
        where: {
            userId: req.session.userId,
            folderId: folderId
        },
        order: [['createdAt', 'DESC']]
    });

    const currentFolder = folderId
        ? await Folder.findByPk(folderId)
        : null;
    
    const breadcrumb = await getBreadcrumb(folderId);
        // build nested tree for sidebar
    const folderTree = buildTree(allFolders);

    res.render('dashboard', {
        username: req.session.username,
        files,
        folders,    
        allFolders,
        folderTree,    
        currentFolder,
        folderId,
        breadcrumb,
    });
});

// ─── GET /search ──────────────────────────────────────────────
router.get('/search', requireLogin, async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ folders: [], files: [] });

    const folders = await Folder.findAll({
        where: {
            userId: req.session.userId,
            name: { [Op.like]: `%${q}%` }
        },
        order: [['name', 'ASC']]
    });

    const files = await UserFile.findAll({
        where: {
            userId: req.session.userId,
            originalName: { [Op.like]: `%${q}%` }
        },
        order: [['originalName', 'ASC']]
    });

    res.json({
        folders: folders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId })),
        files:   files.map(f => ({ id: f.id, name: f.originalName, folderId: f.folderId }))
    });
});
// ─── GET /share/:token ────────────────────────────────────────
router.get('/share/:token', async (req, res) => {
    try {
        const share = await FileShare.findOne({
            where: { token: req.params.token }
        });

        if (!share) return res.status(404).send('Share link not found.');

        if (share.expiresAt && new Date() > share.expiresAt) {
            return res.status(410).send('This share link has expired.');
        }

        const file = await UserFile.findByPk(share.fileId);
        if (!file) return res.status(404).send('File no longer exists.');

        const owner = await User.findByPk(share.ownerId);

        res.render('share-view', { file, owner, token: req.params.token });

    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

// ─── GET /share/:token/download ───────────────────────────────
router.get('/share/:token/download', async (req, res) => {
    const share = await FileShare.findOne({ where: { token: req.params.token } });
    if (!share) return res.status(404).send('Not found.');

    const file = await UserFile.findByPk(share.fileId);
    if (!file) return res.status(404).send('File not found.');

    const filePath = path.join(__dirname, '../public/uploads', file.storedName);
    res.download(filePath, file.originalName);
});

// ─── GET /share/:token/view ───────────────────────────────────
router.get('/share/:token/view', async (req, res) => {
    const share = await FileShare.findOne({ where: { token: req.params.token } });
    if (!share) return res.status(404).send('Not found.');

    const file = await UserFile.findByPk(share.fileId);
    if (!file) return res.status(404).send('File not found.');

    const filePath = path.join(__dirname, '../public/uploads', file.storedName);
    res.setHeader('Content-Type', file.mimetype);
    fs.createReadStream(filePath).pipe(res);
});
// ─── POST /file/share/:id ─────────────────────────────────────
router.post('/file/share/:id', requireLogin, async (req, res) => {
    const { username } = req.body;
    const fileId = req.params.id;

    try {
        const file = await UserFile.findOne({
            where: { id: fileId, userId: req.session.userId }
        });
        if (!file) return res.status(404).json({ error: 'File not found' });

        // check if sharing to specific user
        if (username) {
            const targetUser = await User.findOne({ where: { username } });
            if (!targetUser) return res.json({ error: 'User not found.' });
            if (targetUser.id === req.session.userId) return res.json({ error: 'Cannot share with yourself.' });

            // duplicate file into their account
            await UserFile.create({
                userId:       targetUser.id,
                folderId:     null,
                originalName: file.originalName,
                storedName:   file.storedName,
                mimetype:     file.mimetype,
                size:         file.size
            });

            return res.json({ success: true, message: `File shared with ${username}.` })
        }

        // otherwise generate a public link
        const token = require('crypto').randomBytes(32).toString('hex');
        await FileShare.create({
            fileId,
            ownerId: req.session.userId,
            sharedWithUserId: null,
            token,
            shareType: 'link',
            expiresAt: null
        });

        const shareUrl = `${req.protocol}://${req.get('host')}/share/${token}`;
        res.json({ success: true, shareUrl });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
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

        req.session.userId   = user.id;
        req.session.username = user.username;

        if (req.session.pendingShare) {
            const token = req.session.pendingShare;
            delete req.session.pendingShare;
            return res.redirect('/share/' + token);
        }

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
            where: { id: req.params.id, userId: req.session.userId }
        });

        if (!file) return res.status(404).send('File not found.');

        // only delete physical file if no other users reference it
        const sharedCount = await UserFile.count({
            where: {
                storedName: file.storedName,
                id: { [Op.ne]: file.id }
            }
        });

        if (sharedCount === 0) {
            const filePath = path.join(__dirname, '../public/uploads', file.storedName);
            fs.unlink(filePath, (err) => {
                if (err) console.error('Could not delete file from disk:', err);
            });
        }

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
    const folderId = req.query.folder ? parseInt(req.query.folder) : null;

    try {
        await Folder.create({
            userId: req.session.userId,
            name: name.trim(),
            parentId: folderId  // nest inside current folder
        });
    } catch (err) {
        console.error(err);
    }

    res.redirect('/dashboard' + (folderId ? `?folder=${folderId}` : ''));
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
            where: { id: req.params.id, userId: req.session.userId }
        });

        if (!folder) return res.status(404).send('Folder not found.');

        // recursively delete all nested folders and move files to root
        await deleteFolder(folder, req.session.userId);

        res.redirect('/dashboard' + (folder.parentId ? `?folder=${folder.parentId}` : ''));

    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});
// ─── POST /folder/move/:id ────────────────────────────────────
router.post('/folder/move/:id', requireLogin, async (req, res) => {
    let { folderId } = req.body;
    folderId = folderId === 'null' ? null : parseInt(folderId);

    try {
        const folder = await Folder.findOne({
            where: { id: req.params.id, userId: req.session.userId }
        });

        if (!folder) return res.status(404).send('Folder not found.');

        // prevent moving folder into itself or its own children
        if (folderId && await isDescendant(req.params.id, folderId, req.session.userId)) {
            return res.redirect('/dashboard' + (req.query.folder ? `?folder=${req.query.folder}` : ''));
        }

        folder.parentId = folderId;
        await folder.save();

        res.redirect('/dashboard' + (folderId ? `?folder=${folderId}` : ''));

    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

// prevent dropping a folder into its own descendant
async function isDescendant(folderId, targetId, userId) {
    let current = targetId;
    while (current) {
        if (String(current) === String(folderId)) return true;
        const folder = await Folder.findOne({ where: { id: current, userId } });
        if (!folder) break;
        current = folder.parentId;
    }
    return false;
}

// ─── Helper: build breadcrumb trail ──────────────────────────
async function getBreadcrumb(folderId) {
    const trail = [];
    let current = folderId;

    while (current) {
        const folder = await Folder.findByPk(current);
        if (!folder) break;
        trail.unshift(folder);
        current = folder.parentId;
    }

    // remove last item — it's the current folder, rendered separately
    trail.pop();

    return trail;
}
// ─── Helper: recursively delete folder and children ──────────
async function deleteFolder(folder, userId) {
    // find all child folders
    const children = await Folder.findAll({
        where: { parentId: folder.id, userId }
    });

    // recursively delete each child
    for (const child of children) {
        await deleteFolder(child, userId);
    }

    // move files in this folder to root
    await UserFile.update(
        { folderId: null },
        { where: { folderId: folder.id, userId } }
    );

    await folder.destroy();
}
// ─── POST /file/rename/:id ────────────────────────────────────
router.post('/file/rename/:id', requireLogin, async (req, res) => {
    const { name } = req.body;
    try {
        const file = await UserFile.findOne({
            where: { id: req.params.id, userId: req.session.userId }
        });
        if (!file) return res.status(404).json({ error: 'Not found' });

        file.originalName = name.trim();
        await file.save();
        res.json({ success: true, name: file.originalName });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// ─── POST /folder/rename/:id ──────────────────────────────────
router.post('/folder/rename/:id', requireLogin, async (req, res) => {
    const { name } = req.body;
    try {
        const folder = await Folder.findOne({
            where: { id: req.params.id, userId: req.session.userId }
        });
        if (!folder) return res.status(404).json({ error: 'Not found' });

        folder.name = name.trim();
        await folder.save();
        res.json({ success: true, name: folder.name });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
});

module.exports = router;