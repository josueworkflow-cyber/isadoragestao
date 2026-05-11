/**
 * Constants for the Dashboard
 */

// Dynamic month system — never hardcode months again
export const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
export const MONTH_LABELS = {
    jan:'Janeiro', fev:'Fevereiro', mar:'Março', abr:'Abril',
    mai:'Maio', jun:'Junho', jul:'Julho', ago:'Agosto',
    set:'Setembro', out:'Outubro', nov:'Novembro', dez:'Dezembro'
};
export const MONTH_COLORS = [
    '#2563eb','#7c3aed','#059669','#b45309',
    '#0891b2','#e11d48','#0f766e','#9333ea',
    '#6366f1','#ea580c','#16a34a','#dc2626'
];

export const FABS = ['pian', 'nutri', 'erva', 'mek', 'outros'];
export const FLAB = ['PIAN', 'NUTRI', 'PANTANAL', 'MEK', 'OUTROS'];
export const FC = {
    pian: '#2563eb',
    nutri: '#7c3aed',
    erva: '#059669',
    mek: '#d97706',
    outros: '#64748b',
    all: '#1e3a5f'
};

export const EMPRESAS_INFO = {
    // Principais
    'PIAN ALIMENTOS LTDA': { label: 'Pian Alimentos', produtos: 'Rações Pian', isMain: true, cor: '#2563eb' },
    'NUTRIBAUR ALIMENTOS LTDA': { label: 'Nutribaur Alimentos', produtos: 'Rações Nutribarrasul', isMain: true, cor: '#7c3aed' },
    'INDUSTRIA ERVATEIRA BONETES LTDA': { label: 'Indústria Ervateira Bonetes', produtos: 'Pantanal e Charme', isMain: true, cor: '#059669' },
    'JB COM. E TRANSPORTE LTDA': { label: 'JB Com. e Transporte', produtos: 'Rações Mek', isMain: true, cor: '#d97706' },
    
    // Outros
    'AGRO PECUARIA VARZEA LTDA': { label: 'Agro Pecuária Várzea', produtos: 'Avegran', cor: '#475569' },
    'ALFA PET PRODUTOS P/ ANIMAIS LTDA EPP': { label: 'Alfa Pet Prod. p/ Animais', produtos: 'Areia Logicat, Gatoso, Foficat', cor: '#475569' },
    'ALFAPET MINERACAO E TRANSPORTES DO NORDESTE L': { label: 'Alfapet Min. Transp. Nordeste', produtos: 'Areia Mikcat Premium', cor: '#475569' },
    'BIOBASE ALIMENTACAO ANIMAL LTDA': { label: 'Biobase Alimentação Animal', produtos: 'Ração Izacat', cor: '#475569' },
    'BR-SUL INDUSTRIA E COMERCIO LTDA': { label: 'BR-Sul Indústria e Comércio', produtos: 'Arroz Cachorro', cor: '#475569' },
    'DICLORO INDUSTRIA E COMERCIO DE ALVEJANTES LT': { label: 'Dicloro Ind. e Com. Alvejantes', produtos: 'Água sanitária, lava roupas', cor: '#475569' },
    'ENTRERIOS GESTAO DE NEGOCIOS LTDA': { label: 'Entrerios Gestão de Negócios', produtos: 'Tapete Higiênico Priorità', cor: '#475569' },
    'FERINHA FAB. DE FRALDAS DESCARTAVEIS E PROD.': { label: 'Ferinha Fab. Fraldas Desc.', produtos: 'Tapete Higiênico Mikdog', cor: '#475569' },
    'IZAIR BORBA E CIA LTDA': { label: 'Izair Borba e Cia', produtos: 'Misturão', cor: '#475569' },
    'UNIDOS WOODTECH LTDA': { label: 'Unidos Woodtech', produtos: 'Pellets de madeira', cor: '#475569' },
    'V T VINHOS LTDA ME': { label: 'V T Vinhos', produtos: 'Vinhos Donato', cor: '#475569' }
};

export const FAB_LOGOS = {
    pian: 'assets/img/logo_pian.png',
    erva: 'assets/img/logo_pantanal.png',
    nutri: 'assets/img/logo_nutri.png',
    mek: 'assets/img/logo_mek.png',
    outros: 'assets/img/logo_main.png' // Use main logo or a placeholder for Otros
};

export const LOGO_MAIN = 'assets/img/logo_main.png';
export const LOGO_IZAIR = 'assets/img/logo_izair.png';

export const VND_COLORS = {
    solisnando:'#2563eb', // Blue
    samuel:'#7c3aed',     // Violet
    celso:'#0891b2',      // Cyan
    gregorio:'#059669',   // Emerald
    jairo:'#d97706',      // Amber
    fabio:'#e11d48',      // Rose
    ernido:'#0f766e',     // Teal
    tiago:'#9333ea',      // Purple
    pablo:'#f59e0b',      // Amber
    elberto:'#b45309'     // Bronze
};

export const INACTIVE_VENDORS = ['tiago'];

export const ABC_CITIES = [
  ["ACEGUA", "Aceguá"], ["ARROIO GRANDE", "Arroio Grande"], ["ARROIO DO PADRE", "Arroio do Padre"], ["BAGE", "Bagé"], 
  ["CACAPAVA DO SUL", "Caçapava do Sul"], ["CAMAQUA", "Camaquã"], ["CANDIOTA", "Candiota"], ["CANGUCU", "Canguçu"], 
  ["CAPAO DO LEAO", "Capão do Leão"], ["CERRITO", "Cerrito"], ["CHUI", "Chuí"], ["CRISTAL", "Cristal"], 
  ["DOM PEDRITO", "Dom Pedrito"], ["ENCRUZILHADA DO SUL", "Encruzilhada do Sul"], ["HERVAL", "Herval"], 
  ["HULHA NEGRA", "Hulha Negra"], ["JAGUARAO", "Jaguarão"], ["MORRO REDONDO", "Morro Redondo"], 
  ["PANTANO GRANDE", "Pantano Grande"], ["PEDRAS ALTAS", "Pedras Altas"], ["PEDRO OSORIO", "Pedro Osório"], 
  ["PELOTAS", "Pelotas"], ["PINHEIRO MACHADO", "Pinheiro Machado"], ["PIRATINI", "Piratini"], ["QUARAI", "Quaraí"], 
  ["RIO GRANDE", "Rio Grande"], ["ROSARIO DO SUL", "Rosário do Sul"], ["SANTA MARIA", "Santa Maria"], 
  ["SANTA VITORIA DO PALMAR", "Santa Vitória do Palmar"], ["SANTANA DA BOA VISTA", "Santana da Boa Vista"], 
  ["SANTANA DO LIVRAMENTO", "Santana do Livramento"], ["SAO GABRIEL", "São Gabriel"], 
  ["SAO JOSE DO NORTE", "São José do Norte"], ["SAO LOURENCO DO SUL", "São Lourenço do Sul"], ["TAPES", "Tapes"], 
  ["TURUCU", "Turucu"]
];
