const prisma = require('./src/services/db');

const ABC_CITIES = [
  "ACEGUA", "ARROIO GRANDE", "ARROIO DO PADRE", "BAGE", "CANDIOTA", 
  "CANGUCU", "CAPAO DO LEAO", "CERRITO", "CHUI", "DOM PEDRITO", 
  "HERVAL", "HULHA NEGRA", "JAGUARAO", "MORRO REDONDO", "PEDRAS ALTAS", 
  "PEDRO OSORIO", "PELOTAS", "PINHEIRO MACHADO", "PIRATINI", "RIO GRANDE", 
  "SANTA VITORIA DO PALMAR", "SANTANA DO LIVRAMENTO", "SAO JOSE DO NORTE", 
  "SAO LOURENCO DO SUL", "TURUCU"
];

async function auditCoordinates() {
  const coords = await prisma.cityCoordinate.findMany();
  const coordKeys = new Set(coords.map(c => c.key.toUpperCase().replace(/\s/g, '')));

  console.log('--- Auditoria de Coordenadas (Região Sul) ---');
  const missing = [];
  
  ABC_CITIES.forEach(city => {
    const key = city.toUpperCase().replace(/\s/g, '');
    if (!coordKeys.has(key)) {
      missing.push(city);
    }
  });

  if (missing.length === 0) {
    console.log('✅ Todas as cidades da lista possuem coordenadas!');
  } else {
    console.log(`❌ Faltam coordenadas para ${missing.length} cidades:`);
    missing.forEach(name => console.log(`- ${name}`));
  }
}

auditCoordinates()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
