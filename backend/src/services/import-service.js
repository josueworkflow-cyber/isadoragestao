const prisma = require('./db');

async function listImports() {
    return await prisma.import.findMany({
        orderBy: { createdAt: 'desc' }
    });
}

async function listImportsPage({ page, pageSize, search, type } = {}) {
    const positiveInteger = (value, fallback) => {
        const number = Number(value);
        return Number.isSafeInteger(number) && number > 0 ? number : fallback;
    };
    const limit = Math.min(positiveInteger(pageSize, 10), 100);
    const query = typeof search === 'string' ? search.trim().slice(0, 200) : '';
    const where = {};
    if (query) {
        where.OR = ['vendorKey', 'periodText', 'filename'].map(field => ({
            [field]: { contains: query, mode: 'insensitive' }
        }));
    }
    if (['type1', 'type2', 'adjustment'].includes(type)) where.type = type;

    const total = await prisma.import.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(positiveInteger(page, 1), totalPages);
    const items = await prisma.import.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (currentPage - 1) * limit,
        take: limit
    });
    return { items, total, page: currentPage, pageSize: limit, totalPages };
}

async function deleteImport(id) {
    return await prisma.import.delete({
        where: { id: parseInt(id) }
    });
}

async function updateImportVendor(id, vendorKey) {
    // Also update related records if necessary, but here it's simple
    const imp = await prisma.import.update({
        where: { id: parseInt(id) },
        data: { vendorKey }
    });
    
    // Update related sales
    await prisma.supplierSale.updateMany({
        where: { importId: parseInt(id) },
        data: { vendorKey }
    });
    
    await prisma.clientSale.updateMany({
        where: { importId: parseInt(id) },
        data: { vendorKey }
    });
    
    return imp;
}

async function saveType1Import({ vendorKey, periodText, periodStart, periodEnd, month, week, year, filename, data }) {
    return await prisma.import.create({
        data: {
            type: 'type1',
            vendorKey,
            periodText,
            periodMonth: month,
            periodWeek: week,
            periodYear: year,
            filename,
            rowsCount: data.length,
            supplierSales: {
                create: data.map(item => ({
                    vendorKey,
                    supplierCode: item.supplierCode,
                    supplierName: item.supplierName,
                    factoryKey: item.factoryKey,
                    value: item.value,
                    periodStart,
                    periodEnd
                }))
            }
        }
    });
}

async function saveType2Import({ vendorKey, periodText, month, year, filename, orderCount, data }) {
    return await prisma.import.create({
        data: {
            type: 'type2',
            vendorKey,
            periodText,
            periodMonth: month,
            periodYear: year,
            filename,
            rowsCount: data.length, // Client count
            clientSales: {
                create: data.map(item => ({
                    vendorKey,
                    clientName: item.clientName,
                    clientCode: item.clientCode,
                    totalValue: item.totalValue,
                    city: item.city,
                    periodMonth: month,
                    periodYear: year
                }))
            }
        }
    });
}

const { getCommercialMonth } = require('../config/calendar');

async function saveAdjustment({ vendorKey, factoryKey, month, year, value, description }) {
    const mNum = parseInt(month);
    const commMonth = getCommercialMonth(mNum);
    const periodStart = commMonth ? commMonth.start : new Date(year, mNum - 1, 1);
    const periodEnd = commMonth ? commMonth.end : new Date(year, mNum, 0);
    
    return await prisma.import.create({
        data: {
            type: 'adjustment',
            vendorKey,
            periodText: `Ajuste - ${description || 'Manual'}`,
            periodMonth: mNum,
            periodYear: parseInt(year) || 2026,
            filename: 'AJUSTE MANUAL',
            rowsCount: 1,
            supplierSales: {
                create: {
                    vendorKey,
                    supplierCode: 'AJUSTE',
                    supplierName: description || 'Ajuste Manual',
                    factoryKey,
                    value: parseFloat(value),
                    periodStart,
                    periodEnd
                }
            }
        }
    });
}

module.exports = {
    listImports,
    listImportsPage,
    deleteImport,
    updateImportVendor,
    saveType1Import,
    saveType2Import,
    saveAdjustment
};
