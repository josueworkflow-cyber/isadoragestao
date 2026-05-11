const prisma = require('./src/services/db');

async function main() {
    try {
        const sales = await prisma.supplierSale.findMany({ take: 5 });
        console.log('Sample Sales:', JSON.stringify(sales, null, 2));
        
        const vendors = await prisma.meta.findMany({ select: { vendorKey: true }, distinct: ['vendorKey'] });
        console.log('Vendor Keys in Metas:', vendors.map(v => v.vendorKey));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

main();
