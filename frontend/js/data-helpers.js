/**
 * Data helper functions for calculating realized values and targets
 * Fully dynamic — supports all 12 months without hardcoding.
 */
import { MONTHS } from './constants.js';

/** Helper to get a list of months between start and end (inclusive) */
export const getMonthRange = (start, end) => {
    if (!start || !end) return [];
    const sIdx = MONTHS.indexOf(start);
    const eIdx = MONTHS.indexOf(end);
    if (sIdx === -1 || eIdx === -1) return [];
    const startIdx = Math.min(sIdx, eIdx);
    const endIdx = Math.max(sIdx, eIdx);
    return MONTHS.slice(startIdx, endIdx + 1);
};

/** Get realized value for vendor v, factory f, month m ('jan'..'dez', 'all', or {s, e}) */
export const gv = (D, v, f, m) => {
    if (!D[v] || !D[v][f]) return 0;
    if (m === 'all') return MONTHS.reduce((sum, mk) => sum + (D[v][f][mk] || 0), 0);
    if (typeof m === 'object' && m.s && m.e) {
        return getMonthRange(m.s, m.e).reduce((sum, mk) => sum + (D[v][f][mk] || 0), 0);
    }
    return D[v][f][m] || 0;
};

/** Get meta target for vendor v, factory f, month m ('jan'..'dez', 'all', or {s, e}) */
export const gm = (D, v, f, m) => {
    if (!D[v] || !D[v][f]) return 0;

    // Get annual target base
    let annualMeta = 0;
    if (D[v][f].ma && D[v][f].ma > 0) {
        annualMeta = D[v][f].ma;
    } else if (f === 'total' && D[v].total?.ma && D[v].total.ma > 0) {
        annualMeta = D[v].total.ma;
    } else {
        annualMeta = MONTHS.reduce((sum, mk) => sum + (D[v][f].metas?.[mk] || 0), 0);
    }

    if (m === 'all') {
        return annualMeta;
    }

    if (typeof m === 'object' && m.s && m.e) {
        return getMonthRange(m.s, m.e).reduce((sum, mk) => sum + gm(D, v, f, mk), 0);
    }

    const idx = MONTHS.indexOf(m);
    if (idx === -1) return 0;

    // Sum realized sales in months prior to month m (from index 0 up to idx - 1)
    let previousSales = 0;
    for (let i = 0; i < idx; i++) {
        const prevMonth = MONTHS[i];
        previousSales += gv(D, v, f, prevMonth);
    }

    const remainingMonths = 12 - idx;
    const remainingGoal = annualMeta - previousSales;

    return remainingGoal > 0 ? remainingGoal / remainingMonths : 0;
};
