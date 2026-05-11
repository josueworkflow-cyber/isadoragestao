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
    if (m === 'all') {
        if (f === 'total' && D[v][f].ma) return D[v][f].ma;
        return MONTHS.reduce((sum, mk) => sum + (D[v][f].metas?.[mk] || 0), 0);
    }
    if (typeof m === 'object' && m.s && m.e) {
        return getMonthRange(m.s, m.e).reduce((sum, mk) => sum + (D[v][f].metas?.[mk] || 0), 0);
    }
    return D[v][f].metas?.[m] || 0;
};
