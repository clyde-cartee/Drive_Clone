const searchInput   = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

let debounceTimer = null;

searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = searchInput.value.trim();

    if (!q) {
        closeResults();
        return;
    }

    // debounce — wait 250ms after user stops typing
    debounceTimer = setTimeout(() => runSearch(q), 250);
});

searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) runSearch(searchInput.value.trim());
});

document.addEventListener('mousedown', e => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        closeResults();
    }
});

async function runSearch(q) {
    const res  = await fetch('/search?q=' + encodeURIComponent(q));
    const data = await res.json();
    renderResults(data.folders, data.files, q);
}

function renderResults(folders, files, q) {
    searchResults.innerHTML = '';

    if (folders.length === 0 && files.length === 0) {
        searchResults.innerHTML = `<div class="search-empty">No results for "${q}"</div>`;
        searchResults.classList.add('open');
        return;
    }

    // ── Folders first ─────────────────────────
    if (folders.length > 0) {
        const label = document.createElement('div');
        label.className = 'search-group-label';
        label.textContent = 'Folders';
        searchResults.appendChild(label);

        folders.forEach(folder => {
            const item = document.createElement('a');
            item.className = 'search-item';
            item.href = '/dashboard?folder=' + folder.id;

            const icon = document.createElement('span');
            icon.textContent = '📁 ';

            const name = document.createElement('span');
            name.className = 'search-item-name';
            name.innerHTML = highlight(folder.name, q);

            const tag = document.createElement('span');
            tag.className = 'search-tag';
            tag.textContent = 'folder';

            item.appendChild(icon);
            item.appendChild(name);
            item.appendChild(tag);
            searchResults.appendChild(item);
        });
    }

    // ── Files second ──────────────────────────
    if (files.length > 0) {
        const label = document.createElement('div');
        label.className = 'search-group-label';
        label.textContent = 'Files';
        searchResults.appendChild(label);

        files.forEach(file => {
            const item = document.createElement('a');
            item.className = 'search-item';
            item.href = '/file/' + file.id;
            item.target = '_blank';

            const icon = document.createElement('span');
            icon.textContent = '📄 ';

            const name = document.createElement('span');
            name.className = 'search-item-name';
            name.innerHTML = highlight(file.name, q);

            const tag = document.createElement('span');
            tag.className = 'search-tag';
            tag.textContent = 'file';

            item.appendChild(icon);
            item.appendChild(name);
            item.appendChild(tag);
            searchResults.appendChild(item);
        });

    }

    searchResults.classList.add('open');
}

// highlight matching characters in result
function highlight(text, q) {
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function closeResults() {
    searchResults.classList.remove('open');
    searchResults.innerHTML = '';
}