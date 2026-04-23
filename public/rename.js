// ── Context menu ──────────────────────────────────────────────
const menu = document.createElement('div');
menu.className = 'ctx-menu';
menu.style.display = 'none';
menu.innerHTML = `<div class="ctx-item" id="ctxRename">✏️ Rename</div>`;
document.body.appendChild(menu);

let ctxTarget = null; // { type: 'file'|'folder', id, name, el }

// ── Right click on folder tiles ───────────────────────────────
document.querySelectorAll('.folder-tile').forEach(tile => {
    tile.addEventListener('contextmenu', e => {
        e.preventDefault();
        ctxTarget = {
            type: 'folder',
            id:   tile.dataset.id,
            name: tile.dataset.name,
            el:   tile
        };
        showMenu(e.clientX, e.clientY);
    });
});

// ── Right click on file rows ──────────────────────────────────
document.querySelectorAll('.files-row').forEach(row => {
    row.addEventListener('contextmenu', e => {
        e.preventDefault();
        ctxTarget = {
            type: 'file',
            id:   row.dataset.id,
            name: row.dataset.name,
            el:   row
        };
        showMenu(e.clientX, e.clientY);
    });
});

// ── Show menu ─────────────────────────────────────────────────
function showMenu(x, y) {
    menu.style.display = 'block';

    // keep within viewport
    const menuW = 160;
    const menuH = 40;
    const left = x + menuW > window.innerWidth  ? x - menuW : x;
    const top  = y + menuH > window.innerHeight ? y - menuH : y;

    menu.style.left = left + 'px';
    menu.style.top  = top  + 'px';
}

// ── Hide on click outside ─────────────────────────────────────
document.addEventListener('mousedown', e => {
    if (!menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

// ── Rename action ─────────────────────────────────────────────
document.getElementById('ctxRename').addEventListener('click', () => {
    menu.style.display = 'none';
    if (!ctxTarget) return;
    openRenameModal(ctxTarget);
});

// ── Rename modal ──────────────────────────────────────────────
const modal = document.createElement('div');
modal.className = 'rename-modal';
modal.style.display = 'none';
modal.innerHTML = `
  <div class="rename-box">
    <p class="rename-title">Rename</p>
    <input class="rename-input" type="text" id="renameInput" />
    <div class="rename-actions">
      <button class="rename-cancel" id="renameCancel">Cancel</button>
      <button class="rename-confirm" id="renameConfirm">Rename</button>
    </div>
  </div>
`;
document.body.appendChild(modal);

function openRenameModal(target) {
    modal.style.display = 'flex';
    const input = document.getElementById('renameInput');
    input.value = target.name;
    input.focus();
    input.select();
}

document.getElementById('renameCancel').addEventListener('click', () => {
    modal.style.display = 'none';
});

document.getElementById('renameConfirm').addEventListener('click', () => {
    submitRename();
});

document.getElementById('renameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitRename();
    if (e.key === 'Escape') modal.style.display = 'none';
});

async function submitRename() {
    const newName = document.getElementById('renameInput').value.trim();
    if (!newName || !ctxTarget) return;

    const url = ctxTarget.type === 'file'
        ? '/file/rename/'   + ctxTarget.id
        : '/folder/rename/' + ctxTarget.id;

    const res  = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
    });

    const data = await res.json();
    if (data.success) {
        // update DOM without page reload
        if (ctxTarget.type === 'file') {
            const link = ctxTarget.el.querySelector('.file-name a');
            if (link) link.textContent = data.name;
            ctxTarget.el.dataset.name = data.name;
        } else {
            const nameEl = ctxTarget.el.querySelector('.tile-name');
            if (nameEl) nameEl.textContent = data.name;
            ctxTarget.el.dataset.name = data.name;
        }
        modal.style.display = 'none';
    }
}