const shareModal = document.createElement('div');
shareModal.className = 'share-modal';
shareModal.style.display = 'none';
shareModal.innerHTML = `
  <div class="share-box">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span class="share-title">🔗 Share File</span>
      <button class="share-close" id="shareClose">×</button>
    </div>

    <div class="share-tabs">
      <button class="share-tab active" data-tab="link">Copy Link</button>
      <button class="share-tab" data-tab="user">Share with User</button>
    </div>

    <div class="share-panel active" id="tab-link">
      <p style="font-size:0.85rem; color:var(--muted)">Anyone with this link can view and download.</p>
      <div class="share-link-box">
        <input type="text" id="shareLinkInput" readonly placeholder="Generating link…" />
        <button class="btn-copy" id="shareCopyBtn">Copy</button>
      </div>
    </div>

    <div class="share-panel" id="tab-user">
      <p style="font-size:0.85rem; color:var(--muted)">Instantly adds the file to their account.</p>
      <input class="share-input" type="text" id="shareUsername" placeholder="Enter username…" />
      <button class="share-send" id="shareUserSend">Share</button>
      <span id="shareUserMsg"></span>
    </div>
  </div>
`;
document.body.appendChild(shareModal);

let currentFileId = null;

window.openShareModal = async function(fileId) {
    currentFileId = fileId;
    document.getElementById('shareLinkInput').value = 'Generating…';
    document.getElementById('shareUsername').value = '';
    document.getElementById('shareUserMsg').textContent = '';
    switchTab('link');
    shareModal.style.display = 'flex';

    const data = await postShare(fileId, {});
    document.getElementById('shareLinkInput').value = data.shareUrl || 'Error generating link';
};

shareModal.querySelectorAll('.share-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function switchTab(name) {
    shareModal.querySelectorAll('.share-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === name);
    });
    shareModal.querySelectorAll('.share-panel').forEach(p => {
        p.classList.toggle('active', p.id === 'tab-' + name);
    });
}

document.getElementById('shareCopyBtn').addEventListener('click', () => {
    const val = document.getElementById('shareLinkInput').value;
    if (!val || val === 'Generating…') return;
    navigator.clipboard.writeText(val).then(() => {
        const btn = document.getElementById('shareCopyBtn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    });
});

document.getElementById('shareUserSend').addEventListener('click', async () => {
    const username = document.getElementById('shareUsername').value.trim();
    const msg = document.getElementById('shareUserMsg');
    if (!username) return;

    msg.textContent = 'Sharing…';
    msg.className = '';

    const data = await postShare(currentFileId, { username });
    msg.className = data.error ? 'share-error' : 'share-success';
    msg.textContent = data.error || data.message;
});

document.getElementById('shareClose').addEventListener('click', () => {
    shareModal.style.display = 'none';
});

shareModal.addEventListener('mousedown', e => {
    if (e.target === shareModal) shareModal.style.display = 'none';
});

async function postShare(fileId, body) {
    const res = await fetch('/file/share/' + fileId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return res.json();
}