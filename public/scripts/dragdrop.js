// ── Drag Ghost ────────────────────────────────────────────────
const ghost = document.createElement('div');
ghost.className = 'drag-ghost';
ghost.style.display = 'none';
document.body.appendChild(ghost);

let dragData = null;
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (dragData) {
        ghost.style.left = (mouseX + 14) + 'px';
        ghost.style.top  = (mouseY - 10) + 'px';
    }
});

// ── Register draggable files ──────────────────────────────────
document.querySelectorAll('.files-row').forEach(row => {
    row.addEventListener('mousedown', e => {
        // ignore clicks on buttons, links, selects
        if (e.target.closest('a, button, select, form')) return;

        const fileId   = row.dataset.id;
        const fileName = row.querySelector('.file-name a').textContent.trim();
        const fileType = row.querySelector('.file-type').textContent.trim();

        startDrag(e, { type: 'file', id: fileId }, `📄 ${fileName}`, row);
    });
});

// ── Register draggable folders ────────────────────────────────
document.querySelectorAll('.folder-tile').forEach(tile => {
    tile.addEventListener('mousedown', e => {
        if (e.target.closest('a, button, form')) return;

        const folderId   = tile.dataset.id;
        const folderName = tile.querySelector('.tile-name').textContent.trim();

        startDrag(e, { type: 'folder', id: folderId }, `📁 ${folderName}`, tile);
    });
});

// ── Start drag ────────────────────────────────────────────────
function startDrag(e, data, label, sourceEl) {
    dragData = data;

    ghost.textContent = label;
    ghost.style.display = 'block';
    ghost.style.left = (e.clientX + 14) + 'px';
    ghost.style.top  = (e.clientY - 10) + 'px';

    sourceEl.classList.add('dragging');

    // highlight all drop targets
    getDropTargets().forEach(t => t.el.classList.add('drop-ready'));

    const onMouseUp = e => {
        endDrag(sourceEl);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mouseup', onMouseUp);
}

// ── End drag — find target under cursor ───────────────────────
function endDrag(sourceEl) {
    ghost.style.display = 'none';
    sourceEl.classList.remove('dragging');

    // find which drop target the mouse is over
    const targets = getDropTargets();
    let matched = null;

    targets.forEach(({ el, folderId }) => {
        el.classList.remove('drop-ready');
        el.classList.remove('drop-hover');
        const rect = el.getBoundingClientRect();
        if (
            mouseX >= rect.left && mouseX <= rect.right &&
            mouseY >= rect.top  && mouseY <= rect.bottom
        ) {
            matched = { el, folderId };
        }
    });

    if (matched && dragData) {
        const targetFolderId = matched.folderId;

        if (dragData.type === 'file') {
            submitMove('/file/move/' + dragData.id, targetFolderId);
        } else if (dragData.type === 'folder') {
            if (String(dragData.id) !== String(targetFolderId)) {
                submitMove('/folder/move/' + dragData.id, targetFolderId);
            }
        }
    }

    dragData = null;
}

// ── Collect all drop targets ──────────────────────────────────
function getDropTargets() {
    const targets = [];

    // sidebar home
    const home = document.querySelector('.nav-item[href="/dashboard"]');
    if (home) targets.push({ el: home, folderId: 'null' });

    // sidebar folder rows
    document.querySelectorAll('.nav-folder-row').forEach(row => {
        targets.push({ el: row, folderId: row.dataset.id });
    });

    // folder tiles in main area
    document.querySelectorAll('.folder-tile').forEach(tile => {
        targets.push({ el: tile, folderId: tile.dataset.id });
    });

    return targets;
}

// ── Hover highlight while dragging ───────────────────────────
document.addEventListener('mousemove', () => {
    if (!dragData) return;

    getDropTargets().forEach(({ el, folderId }) => {
        const rect = el.getBoundingClientRect();
        const over =
            mouseX >= rect.left && mouseX <= rect.right &&
            mouseY >= rect.top  && mouseY <= rect.bottom;
        el.classList.toggle('drop-hover', over);
    });
});

// ── Submit via hidden form ────────────────────────────────────
function submitMove(action, targetFolderId) {
    const form  = document.createElement('form');
    form.method = 'POST';
    form.action = action;

    const input = document.createElement('input');
    input.type  = 'hidden';
    input.name  = 'folderId';
    input.value = targetFolderId;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
}