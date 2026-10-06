/**
 * UI Management Module
 */

export function toggleMobileSidebar() {
    if (document.querySelector('.sidebar').classList.contains('mob-open')) {
        closeMobileSidebar();
        return;
    }
    document.querySelector('.sidebar').classList.add('mob-open');
    document.getElementById('mob-overlay').style.display = 'block';
    const button = document.querySelector('.mob-menu-btn');
    button.classList.add('sidebar-open');
    button.setAttribute('aria-label', 'Fechar menu');
    button.setAttribute('aria-expanded', 'true');
}

export function closeMobileSidebar() {
    document.querySelector('.sidebar').classList.remove('mob-open');
    document.getElementById('mob-overlay').style.display = 'none';
    const button = document.querySelector('.mob-menu-btn');
    button.classList.remove('sidebar-open');
    button.setAttribute('aria-label', 'Menu');
    button.setAttribute('aria-expanded', 'false');
}

export function goPage(pageId) {
    window.currentPageId = pageId;
    // Update active tab logic
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('active');
        n.removeAttribute('aria-current');
    });
    const targetNav = document.getElementById('nav-' + pageId);
    if (targetNav) {
        targetNav.classList.add('active');
        targetNav.setAttribute('aria-current', 'page');
    }

    const vendorsMenu = document.getElementById('nav-vendors');
    if (vendorsMenu) {
        const isVendorPage = Boolean(targetNav && vendorsMenu.contains(targetNav));
        vendorsMenu.classList.toggle('has-active-vendor', isVendorPage);
        if (isVendorPage) vendorsMenu.open = true;
    }

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

