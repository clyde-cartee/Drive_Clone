// ── Sidebar folder toggle ─────────────────────
document.querySelectorAll('.nav-toggle').forEach(btn => {
  const targetId = btn.dataset.target;
  const children = document.getElementById(targetId);

  // auto-open if a child is the active folder
  if (children && children.querySelector('.nav-folder-row.active')) {
    children.classList.add('open');
    btn.classList.add('open');
  }

  btn.addEventListener('click', () => {
    const isOpen = children.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
  });
});
// ── Tooltips ──────────────────────────────────
const tooltip = document.createElement('div');
tooltip.className = 'nav-folder-tooltip';
document.body.appendChild(tooltip);

let tooltipTimer = null;

document.querySelectorAll('.nav-folder-row').forEach(row => {
    const nameEl = row.querySelector('.nav-folder-name');
    if (!nameEl) return;
    const name = nameEl.textContent.trim();

    row.addEventListener('mouseenter', e => {
        tooltipTimer = setTimeout(() => {
            tooltip.textContent = name;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 14) + 'px';
            tooltip.style.top  = (e.clientY - 8)  + 'px';
        }, 600); // show after 600ms hover
    });

    row.addEventListener('mousemove', e => {
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top  = (e.clientY - 8)  + 'px';
    });

    row.addEventListener('mouseleave', () => {
        clearTimeout(tooltipTimer);
        tooltip.style.display = 'none';
    });
});