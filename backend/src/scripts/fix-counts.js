const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function fixCounts() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    console.log('--- Corrigindo contagem de pedidos ---');

    const vendors = ['solisnando', 'samuel', 'celso', 'gregorio', 'jairo', 'fabio', 'ernido', 'tiago'];
    
    // Buscar a importação legacy
    const legacyImport = await prisma.import.findFirst({
        where: { type: 'legacy' }
    });

    if (!legacyImport) {
        console.log('Importação legacy não encontrada.');
        return;
    }

    // Contar registros por vendedor e atualizar (simplificado: vamos atualizar o total da importação legacy)
    const totalRows = await prisma.clientSale.count({
        where: { importId: legacyImport.id }
    });

    await prisma.import.update({
        where: { id: legacyImport.id },
        data: { rowsCount: totalRows }
    });

    console.log(`✓ Total de ${totalRows} registros atualizados na importação legacy.`);
    
    await prisma.$disconnect();
}

fixCounts().catch(console.error);
