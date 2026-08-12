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

/** Helper to find the last closed month index (0..11) for a vendor and factory */
export const getLastClosedMonthIndex = (D, v, f) => {
    let maxDataIdx = -1;
    MONTHS.forEach((mk, idx) => {
        if (gv(D, v, f, mk) > 0) {
            maxDataIdx = Math.max(maxDataIdx, idx);
        }
    });

    const now = new Date();
    // Assuming 2026 as application target year
    const currentCalIdx = now.getFullYear() === 2026 ? now.getMonth() - 1 : -1;

    return Math.max(maxDataIdx, currentCalIdx);
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

    const lastClosedIdx = getLastClosedMonthIndex(D, v, f);

    // Case 1: Closed Month (idx <= lastClosedIdx)
    // For a closed month, target "cumprida" equals realized sales in that month
    if (idx <= lastClosedIdx) {
        const closedRealized = gv(D, v, f, m);
        return closedRealized > 0 ? closedRealized : (annualMeta / 12);
    }

    // Case 2: Open Month (idx > lastClosedIdx)
    // Sum total realized sales in all closed months (0 to lastClosedIdx)
    let totalClosedSales = 0;
    for (let i = 0; i <= lastClosedIdx; i++) {
        totalClosedSales += gv(D, v, f, MONTHS[i]);
    }

    // Remaining open months count
    const openMonthsCount = 12 - (lastClosedIdx + 1);
    if (openMonthsCount <= 0) return 0;

    const remainingGoal = annualMeta - totalClosedSales;
    return remainingGoal > 0 ? remainingGoal / openMonthsCount : 0;
};
