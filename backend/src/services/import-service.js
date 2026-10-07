const prisma = require('./db');
const { cents } = require('./sales-money');
const { vendors } = require('../config/vendors');

async function getImportDetails(id, { page, pageSize } = {}) {
    if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) {
        throw Object.assign(new Error('Lançamento inválido.'), { status: 400 });
    }
    const record = await prisma.import.findUnique({ where: { id: Number(id) } });
    if (!record) throw Object.assign(new Error('Lançamento não encontrado. Ele pode ter sido excluído.'), { status: 404 });
    const kind = record.type === 'type2' ? 'clients' : 'suppliers';
    const model = kind === 'clients' ? prisma.clientSale : prisma.supplierSale;
    const valueField = kind === 'clients' ? 'totalValue' : 'value';
    const where = { importId: record.id };
    const positive = (value, fallback) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
    const limit = Math.min(positive(pageSize, 50), 100);
    const [total, aggregate] = await Promise.all([
        model.count({ where }),
        model.aggregate({ where, _sum: { [valueField]: true } })
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(positive(page, 1), totalPages);
    const rows = await model.findMany({ where, orderBy: { id: 'asc' }, skip: (currentPage - 1) * limit, take: limit });
    return {
        import: record,
        vendorLabel: vendors.find(v => v.k === record.vendorKey)?.l || record.vendorKey,
        kind,
        rows,
        totalValue: cents(aggregate._sum[valueField] || 0) / 100,
        pagination: { page: currentPage, pageSize: limit, total, totalPages }
    };
}

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

const { saveAdjustment } = require('./adjustment-service');

module.exports = {
    getImportDetails,
    listImports,
    listImportsPage,
    deleteImport,
    updateImportVendor,
    saveType1Import,
    saveType2Import,
    saveAdjustment
};
