const prisma = require('./src/services/db');

async function listAllCoords() {
  const coords = await prisma.cityCoordinate.findMany({
    orderBy: { name: 'asc' }
  });

  console.log('--- Coordenadas Cadastradas ---');
  coords.forEach(c => {
    console.log(`[${c.key}] - ${c.name} (${c.lat}, ${c.lng})`);
  });
}

listAllCoords()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
