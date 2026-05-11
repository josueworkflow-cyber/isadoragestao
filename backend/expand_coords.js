const prisma = require('./src/services/db');

const NEW_CITIES = [
  { key: 'CAMAQUA', name: 'Camaquã', lat: -30.8508, lng: -51.8119 },
  { key: 'CRISTAL', name: 'Cristal', lat: -30.9833, lng: -52.0478 },
  { key: 'TAPES', name: 'Tapes', lat: -30.6728, lng: -51.3958 },
  { key: 'SAOGABRIEL', name: 'São Gabriel', lat: -30.3358, lng: -54.3200 },
  { key: 'SANTAMARIA', name: 'Santa Maria', lat: -29.6839, lng: -53.8069 },
  { key: 'ROSARIODOSUL', name: 'Rosário do Sul', lat: -30.2578, lng: -54.9139 },
  { key: 'QUARAI', name: 'Quaraí', lat: -30.3875, lng: -56.4514 },
  { key: 'CACAPAVADOSUL', name: 'Caçapava do Sul', lat: -30.5122, lng: -53.4914 },
  { key: 'SANTANADABOAVISTA', name: 'Santana da Boa Vista', lat: -30.8719, lng: -53.1150 },
  { key: 'PANTANOGRANDE', name: 'Pantano Grande', lat: -30.1908, lng: -52.3739 },
  { key: 'ENCRUZILHADADOSUL', name: 'Encruzilhada do Sul', lat: -30.5439, lng: -52.5219 }
];

async function updateCoords() {
  console.log('--- Atualizando Coordenadas ---');
  
  // 1. Fix Santa Vitoria key if it exists as SANTAVITORIA
  const sv = await prisma.cityCoordinate.findUnique({ where: { key: 'SANTAVITORIA' } });
  if (sv) {
    await prisma.cityCoordinate.update({
      where: { key: 'SANTAVITORIA' },
      data: { key: 'SANTAVITORIADOPALMAR', name: 'Santa Vitória do Palmar' }
    });
    console.log('✅ Chave de Santa Vitória corrigida.');
  }

  // 2. Add new cities
  for (const city of NEW_CITIES) {
    await prisma.cityCoordinate.upsert({
      where: { key: city.key },
      update: city,
      create: city
    });
  }
  console.log(`✅ ${NEW_CITIES.length} novas cidades adicionadas ao raio de busca.`);
}

updateCoords()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
