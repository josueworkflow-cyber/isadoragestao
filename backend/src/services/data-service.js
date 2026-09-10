const prisma = require('./db');
const { mapping } = require('../config/suppliers');
const { getCommercialMonth, getCommercialPeriodInfo, getCommercialMonthKey, MONTH_KEYS } = require('../config/calendar');

async function getSalesData() {
    const sales = await prisma.supplierSale.findMany({
        include: { import: true }
    });
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
        const { vendorKey, factoryKey, value, periodStart, periodEnd } = sale;
        let mk;
        if (sale.import && sale.import.periodMonth >= 1 && sale.import.periodMonth <= 12) {
            mk = MONTH_KEYS[sale.import.periodMonth - 1];
        } else {
            mk = getCommercialPeriodInfo(periodStart, periodEnd).monthKey;
        }
        
        initVnd(vendorKey, factoryKey);
        result[vendorKey][factoryKey][mk] = (result[vendorKey][factoryKey][mk] || 0) + value;
        
        // Accumulate totals
        initVnd(vendorKey, 'total');
        result[vendorKey]['total'][mk] = (result[vendorKey]['total'][mk] || 0) + value;
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

        // For annual target, store ma for factory or total
        if (metaAnual > 0) {
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
    const sales = await prisma.supplierSale.findMany({
        include: { import: true }
    });
    const result = {};

    const initVndSup = (vk, sn) => {
        if (!result[vk]) result[vk] = {};
        if (!result[vk][sn]) result[vk][sn] = { 
            jan:0, fev:0, mar:0, abr:0, mai:0, jun:0, jul:0, ago:0, set:0, out:0, nov:0, dez:0 
        };
    };

    sales.forEach(sale => {
        const { vendorKey, supplierName, value, periodStart, periodEnd } = sale;
        let mk;
        if (sale.import && sale.import.periodMonth >= 1 && sale.import.periodMonth <= 12) {
            mk = MONTH_KEYS[sale.import.periodMonth - 1];
        } else {
            mk = getCommercialPeriodInfo(periodStart, periodEnd).monthKey;
        }
        
        initVndSup(vendorKey, supplierName);
        result[vendorKey][supplierName][mk] = (result[vendorKey][supplierName][mk] || 0) + value;
    });

    return result;
}

async function getWeeklySupplierData(vendorKey, month) {
    const { vendors } = require('../config/vendors');
    const { empresasInfo } = require('../config/suppliers');
    
    const monthNum = parseInt(month);
    const officialMonth = getCommercialMonth(monthNum);
    if (!officialMonth) {
        throw new Error(`Mês comercial inválido: ${month}`);
    }

    const officialWeeks = officialMonth.weeks;
    const numWeeks = officialWeeks.length;

    // Find vendor label
    const vendorInfo = vendors.find(v => v.k === vendorKey);
    const vendorLabel = vendorInfo ? vendorInfo.l.toUpperCase() : vendorKey.toUpperCase();

    // Query sales for this vendor for this commercial month
    // Exclude manual adjustments from weekly columns to prevent phantom weeks
    const sales = await prisma.supplierSale.findMany({
        where: {
            vendorKey,
            OR: [
                {
                    import: {
                        periodMonth: monthNum,
                        type: { not: 'adjustment' }
                    }
                },
                {
                    periodStart: {
                        gte: officialMonth.start,
                        lte: officialMonth.end
                    },
                    import: {
                        type: { not: 'adjustment' }
                    }
                }
            ]
        },
        include: {
            import: true
        },
        orderBy: { periodStart: 'asc' }
    });

    // Canonical week labels from the official calendar
    const weekLabels = officialWeeks.map(w => ({
        label: w.label,
        range: w.range
    }));

    // Group by supplier
    const supplierMap = {};
    sales.forEach(sale => {
        if (!supplierMap[sale.supplierName]) {
            const info = empresasInfo[sale.supplierName];
            supplierMap[sale.supplierName] = {
                name: sale.supplierName,
                product: info ? info.produtos : '',
                weekValues: new Array(numWeeks).fill(0),
                total: 0
            };
        }

        // Determine which official week index (0..numWeeks-1) this sale belongs to
        let weekIdx = -1;
        if (sale.import && sale.import.periodWeek >= 1 && sale.import.periodWeek <= numWeeks) {
            weekIdx = sale.import.periodWeek - 1;
        } else {
            const info = getCommercialPeriodInfo(sale.periodStart, sale.periodEnd);
            if (info.month === monthNum && info.week >= 1 && info.week <= numWeeks) {
                weekIdx = info.week - 1;
            } else {
                // Find closest official week in this month
                const saleDay = sale.periodStart.getTime();
                let closestDist = Infinity;
                officialWeeks.forEach((w, idx) => {
                    const dist = Math.abs(saleDay - w.start.getTime());
                    if (dist < closestDist) {
                        closestDist = dist;
                        weekIdx = idx;
                    }
                });
            }
        }

        if (weekIdx >= 0 && weekIdx < numWeeks) {
            supplierMap[sale.supplierName].weekValues[weekIdx] += sale.value;
            supplierMap[sale.supplierName].total += sale.value;
        }
    });

    // Sort suppliers by name
    const suppliers = Object.values(supplierMap).sort((a, b) => a.name.localeCompare(b.name));

    // Grand total across official weeks
    const grandTotalWeeks = new Array(numWeeks).fill(0);
    let grandTotal = 0;
    suppliers.forEach(s => {
        s.weekValues.forEach((v, i) => { grandTotalWeeks[i] += v; });
        grandTotal += s.total;
    });

    return {
        vendorKey,
        vendorLabel,
        month: monthNum,
        monthName: officialMonth.name,
        periodText: officialMonth.periodText,
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
