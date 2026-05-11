const fs = require('fs');
const path = require('path');
const prisma = require('../services/db');

async function migrateCoordinates() {
    try {
        console.log('--- MIGRANDO COORDENADAS PARA O BANCO ---');
        
        const files = ['GEO_JAN.json', 'GEO_FEV.json'];
        const cityMap = new Map();

        for (const file of files) {
            const filePath = path.join(__dirname, '..', '..', '..', 'frontend', 'data', file);
            console.log(`Verificando arquivo: ${filePath}`);
            if (!fs.existsSync(filePath)) {
                console.log(`Arquivo não encontrado: ${file}`);
                continue;
            }

            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            data.forEach(city => {
                const cleanKey = city.key.toUpperCase().replace(/\s/g, '');
                if (!cityMap.has(cleanKey)) {
                    cityMap.set(cleanKey, {
                        key: cleanKey,
                        name: city.city,
                        lat: city.lat,
                        lng: city.lng
                    });
                }
            });
        }

        console.log(`Encontradas ${cityMap.size} cidades únicas.`);

        for (const city of cityMap.values()) {
            await prisma.cityCoordinate.upsert({
                where: { key: city.key },
                update: {
                    name: city.name,
                    lat: city.lat,
                    lng: city.lng
                },
                create: city
            });
        }

        console.log('✅ Migração concluída com sucesso!');
    } catch (err) {
        console.error('Erro na migração:', err);
    } finally {
        await prisma.$disconnect();
    }
}

migrateCoordinates();
