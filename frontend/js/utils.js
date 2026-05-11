/**
 * Utility functions for the Dashboard
 */

export const fmt = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const pN = (r, m) => m > 0 ? (r / m) * 100 : null;
export const pS = (r, m) => m > 0 ? ((r / m) * 100).toFixed(1) + '%' : '—';

export function scColor(p) {
    if (p === null) return '#64748b';
    if (p >= 100) return '#059669';
    if (p >= 80) return '#2563eb';
    if (p >= 50) return '#d97706';
    return '#dc2626';
}

export function scBg(p) {
    if (p === null) return '#f1f5f9';
    if (p >= 100) return '#ecfdf5';
    if (p >= 80) return '#eff6ff';
    if (p >= 50) return '#fffbeb';
    return '#fef2f2';
}

export function scLabel(p) {
    if (p === null) return 'Sem meta';
    if (p >= 100) return 'Meta Batida';
    if (p >= 80) return 'Ótimo';
    if (p >= 50) return 'Regular';
    return 'Abaixo';
}
