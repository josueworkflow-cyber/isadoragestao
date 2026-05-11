const prisma = require('./src/services/db');

function normalizeCity(city) {
    if (!city) return 'Não Encontrada';
    const c = city.trim().toUpperCase();
    const map = {
        'ARROIO GRA': 'ARROIO GRANDE',
        'ARROIO DO': 'ARROIO DO PADRE',
        'BAGE': 'BAGE',
        'CANGUCU': 'CANGUCU',
        'CAPAO DO L': 'CAPAO DO LEAO',
        'CERRITO': 'CERRITO',
        'CHUI': 'CHUI',
        'DOM PEDRIT': 'DOM PEDRITO',
        'HERVAL': 'HERVAL',
        'HULHA NEGR': 'HULHA NEGRA',
        'JAGUARAO': 'JAGUARAO',
        'MORRO REDO': 'MORRO REDONDO',
        'PEDRAS ALT': 'PEDRAS ALTAS',
        'PEDRO OSOR': 'PEDRO OSORIO',
        'PELOTAS': 'PELOTAS',
        'PINHEIRO M': 'PINHEIRO MACHADO',
        'PIRATINI': 'PIRATINI',
        'RIO GRANDE': 'RIO GRANDE',
        'S.VITORIA ': 'SANTA VITORIA DO PALMAR',
        'SANTA VITO': 'SANTA VITORIA DO PALMAR',
        'SANTANA DO': 'SANTANA DO LIVRAMENTO',
        'SAO JOSE D': 'SAO JOSE DO NORTE',
        'SAO LOUREN': 'SAO LOURENCO DO SUL',
        'TURUCU': 'TURUCU'
    };
    if (map[c]) return map[c];
    for (const [key, val] of Object.entries(map)) {
        if (c.startsWith(key)) return val;
    }
    return c;
}

async function fixCities() {
  const sales = await prisma.clientSale.findMany();
  console.log(`Verificando ${sales.length} registros...`);
  
  let fixed = 0;
  for (const sale of sales) {
    const fixedCity = normalizeCity(sale.city);
    if (fixedCity !== sale.city) {
      await prisma.clientSale.update({
        where: { id: sale.id },
        data: { city: fixedCity }
      });
      fixed++;
    }
  }

  console.log(`Sucesso! ${fixed} cidades foram corrigidas.`);
}

fixCities()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
