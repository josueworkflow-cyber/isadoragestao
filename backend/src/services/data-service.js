const prisma = require('./db');
const { mapping } = require('../config/suppliers');

async function getSalesData() {
    const sales = await prisma.supplierSale.findMany();
    const result = {};

    // Base structure initialization
    const initVnd = (vk, fk) => {
        if (!result[vk]) result[vk] = {};
        if (!result[vk][fk]) result[vk][fk] = { 
            jan:0, fev:0, mar:0, abr:0, mai:0, jun:0, jul:0, ago:0, set:0, out:0, nov:0, dez:0, 
            mm:0, ma:0, metas: {} 
        };
    };

    sales.forEach(sale => {
        const { vendorKey, factoryKey, value, periodStart } = sale;
        const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const month = months[periodStart.getMonth()];
        
        initVnd(vendorKey, factoryKey);
        result[vendorKey][factoryKey][month] = (result[vendorKey][factoryKey][month] || 0) + value;
        
        // Accumulate totals
        initVnd(vendorKey, 'total');
        result[vendorKey]['total'][month] = (result[vendorKey]['total'][month] || 0) + value;
    });

    // Add metas from the Meta table
    const metas = await prisma.meta.findMany();
    metas.forEach(meta => {
        const { vendorKey, factoryKey, month, metaMensal, metaAnual } = meta;
        initVnd(vendorKey, factoryKey);
        
        // Store month-specific meta
        const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const mk = months[month - 1];
        if (mk) {
            result[vendorKey][factoryKey].metas[mk] = metaMensal;
        }

        // For annual target, we still use ma or total of mm if needed
        if (factoryKey === 'total') {
            result[vendorKey][factoryKey].ma = metaAnual;
        }
    });

    return result;
}

async function getVendorsList() {
    // This usually comes from a fixed list but with updated order counts
    const { vendors } = require('../config/vendors');
    
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const pedKeys = ['pj', 'pf', 'pm', 'pa', 'pmai', 'pjun', 'pjul', 'pago', 'pset', 'pout', 'pnov', 'pdez'];

    const updatedVendors = await Promise.all(vendors.map(async (v) => {
        // Get auto counts
        const counts = await prisma.clientSale.groupBy({
            by: ['periodMonth'],
            where: { vendorKey: v.k },
            _count: true
        });

        // Get manual overrides
        const manualOrders = await prisma.meta.findMany({
            where: { vendorKey: v.k, factoryKey: 'orders' }
        });

        const getC = (m) => {
            const manual = manualOrders.find(o => o.month === m);
            if (manual && manual.metaMensal > 0) return manual.metaMensal;
            return counts.find(c => c.periodMonth === m)?._count || 0;
        };

        const result = { ...v };
        months.forEach((mk, idx) => {
            result[pedKeys[idx]] = getC(idx + 1);
        });

        return result;
    }));

    return updatedVendors;
}

async function getABCData(monthNum) {
    const sales = await prisma.clientSale.findMany({
        where: { periodMonth: monthNum }
    });

    const result = {};
    sales.forEach(sale => {
        if (!result[sale.vendorKey]) result[sale.vendorKey] = [];
        
        // Simple logic for ABC curve (A > 2000, B > 500, else C) - can be adjusted
        let curve = 'C';
        if (sale.totalValue > 2000) curve = 'A';
        else if (sale.totalValue > 500) curve = 'B';

        result[sale.vendorKey].push({
            n: sale.clientName,
            v: sale.totalValue,
            ck: sale.city.toUpperCase().replace(/\s/g, ''),
            cd: sale.city,
            a: curve
        });
    });

    // Sort by value desc
    Object.keys(result).forEach(vk => {
        result[vk].sort((a, b) => b.v - a.v);
    });

    return result;
}

async function getCoordinates() {
    return await prisma.cityCoordinate.findMany();
}

async function getFabricasDetails() {
    const sales = await prisma.supplierSale.findMany();
    const result = {};

    const initVndSup = (vk, sn) => {
        if (!result[vk]) result[vk] = {};
        if (!result[vk][sn]) result[vk][sn] = { 
            jan:0, fev:0, mar:0, abr:0, mai:0, jun:0, jul:0, ago:0, set:0, out:0, nov:0, dez:0 
        };
    };

    sales.forEach(sale => {
        const { vendorKey, supplierName, value, periodStart } = sale;
        const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const month = months[periodStart.getMonth()];
        
        initVndSup(vendorKey, supplierName);
        result[vendorKey][supplierName][month] = (result[vendorKey][supplierName][month] || 0) + value;
    });

    return result;
}

async function getWeeklySupplierData(vendorKey, month) {
    const { vendors } = require('../config/vendors');
    const { empresasInfo } = require('../config/suppliers');
    
    // Build date range for the month (year 2026 assumed from project context)
    const year = 2026;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

    const sales = await prisma.supplierSale.findMany({
        where: {
            vendorKey,
            periodStart: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: { periodStart: 'asc' }
    });

    // Find vendor label
    const vendorInfo = vendors.find(v => v.k === vendorKey);
    const vendorLabel = vendorInfo ? vendorInfo.l.toUpperCase() : vendorKey.toUpperCase();

    // Discover unique weeks (by periodStart-periodEnd pairs)
    const weekMap = new Map();
    sales.forEach(sale => {
        const key = `${sale.periodStart.toISOString()}_${sale.periodEnd.toISOString()}`;
        if (!weekMap.has(key)) {
            weekMap.set(key, {
                start: sale.periodStart,
                end: sale.periodEnd
            });
        }
    });

    // Sort weeks chronologically
    const weeks = Array.from(weekMap.values()).sort((a, b) => a.start - b.start);
    const weekLabels = weeks.map((w, i) => ({
        label: `SEMANA ${i + 1}`,
        range: `${w.start.getDate().toString().padStart(2, '0')}/${(w.start.getMonth() + 1).toString().padStart(2, '0')} - ${w.end.getDate().toString().padStart(2, '0')}/${(w.end.getMonth() + 1).toString().padStart(2, '0')}`
    }));

    // Group by supplier
    const supplierMap = {};
    sales.forEach(sale => {
        if (!supplierMap[sale.supplierName]) {
            const info = empresasInfo[sale.supplierName];
            supplierMap[sale.supplierName] = {
                name: sale.supplierName,
                product: info ? info.produtos : '',
                weekValues: new Array(weeks.length).fill(0),
                total: 0
            };
        }
        // Find which week index this sale belongs to
        const weekKey = `${sale.periodStart.toISOString()}_${sale.periodEnd.toISOString()}`;
        const weekIdx = Array.from(weekMap.keys()).indexOf(weekKey);
        if (weekIdx >= 0) {
            supplierMap[sale.supplierName].weekValues[weekIdx] += sale.value;
            supplierMap[sale.supplierName].total += sale.value;
        }
    });

    // Sort suppliers by name
    const suppliers = Object.values(supplierMap).sort((a, b) => a.name.localeCompare(b.name));

    // Grand total
    const grandTotalWeeks = new Array(weeks.length).fill(0);
    let grandTotal = 0;
    suppliers.forEach(s => {
        s.weekValues.forEach((v, i) => { grandTotalWeeks[i] += v; });
        grandTotal += s.total;
    });

    return {
        vendorKey,
        vendorLabel,
        weeks: weekLabels,
        suppliers,
        grandTotal: {
            weekValues: grandTotalWeeks,
            total: grandTotal
        }
    };
}

async function saveMeta(vendorKey, factoryKey, month, metaMensal, metaAnual) {
    return await prisma.meta.upsert({
        where: {
            vendorKey_factoryKey_month: {
                vendorKey,
                factoryKey,
                month: month || 1
            }
        },
        update: {
            metaMensal,
            metaAnual: metaAnual || 0
        },
        create: {
            vendorKey,
            factoryKey,
            month: month || 1,
            metaMensal,
            metaAnual: metaAnual || 0
        }
    });
}

module.exports = {
    getSalesData,
    getVendorsList,
    getABCData,
    getCoordinates,
    getFabricasDetails,
    getWeeklySupplierData,
    saveMeta
};
