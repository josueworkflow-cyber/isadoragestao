const prisma = require('./db');

async function listImports() {
    return await prisma.import.findMany({
        orderBy: { createdAt: 'desc' }
    });
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

async function saveAdjustment({ vendorKey, factoryKey, month, year, value, description }) {
    // Create a generic start/end date based on month/year
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // Last day of month
    
    return await prisma.import.create({
        data: {
            type: 'adjustment',
            vendorKey,
            periodText: `Ajuste - ${description || 'Manual'}`,
            periodMonth: parseInt(month),
            periodYear: parseInt(year),
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
    deleteImport,
    updateImportVendor,
    saveType1Import,
    saveType2Import,
    saveAdjustment
};
