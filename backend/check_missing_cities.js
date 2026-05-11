const prisma = require('./src/services/db');

async function checkMissingCities() {
  const salesCities = await prisma.clientSale.groupBy({
    by: ['city'],
  });

  const coords = await prisma.cityCoordinate.findMany();
  const coordKeys = new Set(coords.map(c => c.key.toUpperCase().replace(/\s/g, '')));

  const missing = [];
  salesCities.forEach(s => {
    if (!s.city) return;
    const key = s.city.toUpperCase().replace(/\s/g, '');
    if (!coordKeys.has(key)) {
      missing.push(s.city);
    }
  });

  console.log('--- Cidades Faltando no Mapa ---');
  if (missing.length === 0) {
    console.log('Nenhuma cidade faltando!');
  } else {
    // Unique missing names
    [...new Set(missing)].forEach(name => console.log(`- ${name}`));
  }
}

checkMissingCities()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
