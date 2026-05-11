/**
 * UI Management Module
 */

export function toggleMobileSidebar() {
    document.querySelector('.sidebar').classList.add('mob-open');
    document.getElementById('mob-overlay').style.display = 'block';
}

export function closeMobileSidebar() {
    document.querySelector('.sidebar').classList.remove('mob-open');
    document.getElementById('mob-overlay').style.display = 'none';
}

export function goPage(pageId) {
    // Update active tab logic
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const targetNav = document.getElementById('nav-' + pageId);
    if (targetNav) targetNav.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.innerWidth <= 1024) closeMobileSidebar();
}

export function toggleFilter(id, btn) {
    const menu = document.getElementById(id);
    const isOpen = menu.style.display === 'block';
    
    // Close all first
    document.querySelectorAll('.filter-dropdown-menu').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('open'));

    if (!isOpen) {
        menu.style.display = 'block';
        btn.classList.add('open');
    }
}

export function openModal(id) {
    const el = document.getElementById('modal-' + id);
    if (el) el.style.display = 'flex';
}

export function closeModal(id) {
    const el = document.getElementById('modal-' + id);
    if (el) el.style.display = 'none';
}

// Global listener to close dropdowns when clicking outside
window.addEventListener('click', (e) => {
    if (!e.target.closest('.filter-dropdown')) {
        document.querySelectorAll('.filter-dropdown-menu').forEach(m => m.style.display = 'none');
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('open'));
    }
});

