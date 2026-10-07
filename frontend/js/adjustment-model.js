// Accept Brazilian currency notation and decimal dots, without silently truncating text.
export function parseAdjustmentMoney(text) {
    const raw = String(text ?? '').trim().replace(/^R\$\s*/, '');
    let normalized;
    if (raw.includes(',')) {
        if (!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw)) return null;
        normalized = raw.replace(/\./g, '').replace(',', '.');
    } else if (/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(raw)) {
        normalized = raw.replace(/\./g, '');
    } else {
        if (!/^[+-]?\d+(?:\.\d{1,2})?$/.test(raw)) return null;
        normalized = raw;
    }
    const cents = Math.round(Number(normalized) * 100);
    return Number.isSafeInteger(cents) ? cents / 100 : null;
}

export function adjustmentPreview(balance, mode, amount) {
    if (!balance || amount === null || !['target', 'delta'].includes(mode)) return null;
    const current = Math.round(balance.currentValue * 100);
    const entered = Math.round(amount * 100);
    const difference = mode === 'target' ? entered - current : entered;
    const corrected = current + difference;
    const vendorTotal = Math.round(balance.vendorTotal * 100) + difference;
    if (![difference, corrected, vendorTotal].every(Number.isSafeInteger)) return null;
    return { difference: difference / 100, corrected: corrected / 100, vendorTotal: vendorTotal / 100 };
}
