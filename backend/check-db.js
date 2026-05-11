const prisma = require('./src/services/db');

async function main() {
    try {
        const salesCount = await prisma.supplierSale.count();
        const metaCount = await prisma.meta.count();
        const importCount = await prisma.import.count();
        console.log(`Sales: ${salesCount}, Metas: ${metaCount}, Imports: ${importCount}`);
    } catch (e) {
        console.error('Error querying DB:', e.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

main();
