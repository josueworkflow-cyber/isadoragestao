const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const prisma = require('../services/db');

const DATA_DIR = path.join(__dirname, '../../../frontend/data');

async function migrate() {
    console.log('--- Iniciando Migração de Dados JSON ---');

    // 1. Metas e Vendas de Fornecedores (de D.json)
    const dData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'D.json'), 'utf8'));
    
    // Create a dummy import for historical data
    const legacyImport = await prisma.import.create({
        data: {
            type: 'legacy',
            vendorKey: 'system',
            periodText: 'Dados Históricos (Jan-Mar)',
            periodMonth: 3,
            periodYear: 2026,
            filename: 'D.json',
            rowsCount: 0
        }
    });

    for (const [vendorKey, factories] of Object.entries(dData)) {
        for (const [factoryKey, values] of Object.entries(factories)) {
            // Save Metas
            if (values.mm || values.ma) {
                await prisma.meta.upsert({
                    where: { vendorKey_factoryKey: { vendorKey, factoryKey } },
                    update: { metaMensal: values.mm || 0, metaAnual: values.ma || 0 },
                    create: { vendorKey, factoryKey, metaMensal: values.mm || 0, metaAnual: values.ma || 0 }
                });
            }

            // Save Sales (simplified: create records for Jan, Feb, Mar)
            const months = { jan: 1, fev: 2, mar: 3 };
            for (const [mKey, mNum] of Object.entries(months)) {
                if (values[mKey]) {
                    await prisma.supplierSale.create({
                        data: {
                            importId: legacyImport.id,
                            vendorKey,
                            supplierCode: 'LEGACY',
                            supplierName: factoryKey.toUpperCase(),
                            factoryKey,
                            value: values[mKey],
                            periodStart: new Date(2026, mNum - 1, 1),
                            periodEnd: new Date(2026, mNum - 1, 28)
                        }
                    });
                }
            }
        }
    }
    console.log('✓ Metas e Vendas de Fornecedores migradas.');

    // 2. Clientes ABC (de ABC_JAN, ABC_FEV, ABC_MAR)
    const abcFiles = [
        { file: 'ABC_JAN.json', m: 1 },
        { file: 'ABC_FEV.json', m: 2 },
        { file: 'ABC_MAR.json', m: 3 }
    ];

    for (const { file, m } of abcFiles) {
        const filePath = path.join(DATA_DIR, file);
        if (!fs.existsSync(filePath)) continue;

        const abcData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        for (const [vendorLabel, clients] of Object.entries(abcData)) {
            const vendorKey = vendorLabel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            
            for (const client of clients) {
                await prisma.clientSale.create({
                    data: {
                        importId: legacyImport.id,
                        vendorKey,
                        clientName: client.n,
                        clientCode: 'LEGACY',
                        totalValue: client.v,
                        city: client.cd || 'Não Encontrada',
                        periodMonth: m,
                        periodYear: 2026
                    }
                });
            }
        }
    }
    console.log('✓ Clientes ABC migrados.');

    console.log('--- Migração Concluída com Sucesso! ---');
}

migrate()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
