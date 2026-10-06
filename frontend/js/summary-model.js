import { FABS, FLAB, FC, MONTHS, MONTH_LABELS } from './constants.js';
import { gv, gm } from './data-helpers.js';
import { pN } from './utils.js';

// Accumulated sales are compared with the annual goal. Monthly targets retain
// the proportional rule shared with the vendor and report pages.
export function buildSummary(data, requestedMonth = 'all') {
    const month = MONTHS.includes(requestedMonth) ? requestedMonth : 'all';
    const months = month === 'all' ? MONTHS : [month];
    const D = data.D || {};
    const vendors = (data.VND_LIST || []).map(vendor => {
        const realized = gv(D, vendor.k, 'total', month);
        const target = gm(D, vendor.k, 'total', month);
        const annualTarget = gm(D, vendor.k, 'total', 'all');
        return { ...vendor, realized, target, annualTarget,
            achievement: pN(realized, target), gap: target > 0 ? Math.max(0, target - realized) : null,
            hasSales: months.some(mk => (D[vendor.k]?.total?.[mk] || 0) !== 0),
        };
    }).sort((a, b) => b.realized - a.realized || a.l.localeCompare(b.l, 'pt-BR'));
    const realized = vendors.reduce((sum, vendor) => sum + vendor.realized, 0);
    const target = vendors.reduce((sum, vendor) => sum + vendor.target, 0);
    const factories = FABS.map((key, index) => ({ key, label: FLAB[index], color: FC[key],
        realized: vendors.reduce((sum, vendor) => sum + gv(D, vendor.k, key, month), 0),
        target: vendors.reduce((sum, vendor) => sum + gm(D, vendor.k, key, month), 0),
    })).sort((a, b) => b.realized - a.realized);
    const factoryTotal = factories.reduce((sum, factory) => sum + factory.realized, 0);
    const canShowDistribution = factoryTotal > 0 && factories.every(factory => factory.realized >= 0);
    factories.forEach(factory => {
        factory.share = canShowDistribution ? factory.realized / factoryTotal * 100 : null;
        factory.achievement = pN(factory.realized, factory.target);
    });
    return { month, months, vendors, factories, realized, target, factoryTotal, canShowDistribution,
        achievement: pN(realized, target), gap: target > 0 ? Math.max(0, target - realized) : null,
        periodLabel: month === 'all' ? 'Acumulado 2026' : `${MONTH_LABELS[month]} de 2026`,
        targetLabel: month === 'all' ? 'Meta anual' : 'Meta do mês',
        vendorsWithSales: vendors.filter(vendor => vendor.hasSales).length,
        missingTargets: vendors.filter(vendor => vendor.annualTarget <= 0).length,
        hasSales: vendors.some(vendor => vendor.hasSales) || factories.some(factory => factory.realized !== 0),
        totalsMatch: Math.abs(realized - factoryTotal) < 0.01,
    };
}
