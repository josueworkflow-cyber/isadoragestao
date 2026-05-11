const XLSX = require('xlsx');

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
        'SANTANA DA': 'SANTANA DA BOA VISTA',
        'SAO GABRIE': 'SAO GABRIEL',
        'SANTA MARI': 'SANTA MARIA',
        'ROSARIO DO': 'ROSARIO DO SUL',
        'CACAPAVA D': 'CACAPAVA DO SUL',
        'PANTANO GR': 'PANTANO GRANDE',
        'ENCRUZILHA': 'ENCRUZILHADA DO SUL',
        'SAO JOSE D': 'SAO JOSE DO NORTE',
        'SAO LOUREN': 'SAO LOURENCO DO SUL',
        'TURUCU': 'TURUCU'
    };
    if (map[c]) return map[c];
    
    // Fallback: check if the input starts with any key in the map
    for (const [key, val] of Object.entries(map)) {
        if (c.startsWith(key)) return val;
    }
    return c;
}

function parseType2(bufferA, bufferB) {
    const wbB = XLSX.read(bufferB, { type: 'buffer' });
    const sheetB = wbB.Sheets[wbB.SheetNames[0]];
    const rowsB = XLSX.utils.sheet_to_json(sheetB, { header: 1, defval: '' });

    let periodText = '';
    let month = new Date().getMonth() + 1;
    let year = new Date().getFullYear();
    const periodLine = rowsB.find(r => r.some(c => String(c).includes('Periodo do Relatório'))) || [];
    periodText = periodLine.find(c => String(c).includes('á')) || '';
    if (periodText) {
        const matches = periodText.match(/(\d{2}\/\d{2}\/\d{4})/g);
        if (matches && matches.length >= 1) {
            const startStr = matches[0];
            const [, m, y] = startStr.split('/').map(Number);
            month = m;
            year = y;
        }
    }

    const cityMap = {}; 
    const nameMapB = {}; 
    let headerBIndex = -1;
    let codeColB = 1; 
    let cityColB = 14; 
    for (let i = 0; i < rowsB.length; i++) {
        const row = rowsB[i];
        if (row.some(c => String(c).includes('Cidade'))) {
            headerBIndex = i;
            codeColB = row.findIndex(c => /Cód|Código/i.test(String(c)));
            cityColB = row.findIndex(c => /Cidade/i.test(String(c)));
            break;
        }
    }
    if (headerBIndex !== -1) {
        for (let i = headerBIndex + 1; i < rowsB.length; i++) {
            const row = rowsB[i];
            const code = String(row[codeColB] || '').trim();
            const city = String(row[cityColB] || '').trim();
            const name = String(row[2] || '').trim(); 
            if (code && !isNaN(code)) {
                cityMap[code] = city;
                nameMapB[code] = name;
            }
        }
    }

    const wbA = XLSX.read(bufferA, { type: 'buffer' });
    const sheetA = wbA.Sheets[wbA.SheetNames[0]];
    const rowsA = XLSX.utils.sheet_to_json(sheetA, { header: 1, defval: '' });

    let headerAIndex = -1;
    let colMapA = { order: 1, code: 4, name: 7, value: 15 };
    for (let i = 0; i < rowsA.length; i++) {
        const row = rowsA[i];
        if (row.some(c => /Pedido/i.test(String(c))) && row.some(c => /Valor Tot/i.test(String(c)))) {
            headerAIndex = i;
            colMapA.order = row.findIndex(c => /Pedido/i.test(String(c)));
            colMapA.code = row.findIndex(c => /Cód|Código/i.test(String(c)));
            colMapA.name = row.findIndex(c => /Cliente/i.test(String(c)));
            colMapA.value = row.findIndex(c => /Valor Tot/i.test(String(c)));
            break;
        }
    }

    const clientData = {}; 
    let orderCount = 0;
    const startIdx = (headerAIndex === -1 ? 6 : headerAIndex + 1);

    for (let i = startIdx; i < rowsA.length; i++) {
        const row = rowsA[i];
        let orderId = String(row[colMapA.order] || '').trim();
        let currentCode = '';
        let currentName = '';
        let currentValue = 0;

        // Try both current and next column for Pedido ID (handles shift)
        if (!/^\d{4,12}$/.test(orderId)) {
            orderId = String(row[colMapA.order + 1] || '').trim();
        }

        if (!/^\d{4,12}$/.test(orderId)) continue;

        // If we have a valid order, find the client code and name
        currentCode = String(row[colMapA.code] || '').trim();
        currentName = String(row[colMapA.name] || row[colMapA.name + 1] || '').trim();

        // VALOR: Look from the end of the row for the first numeric-looking string
        for (let j = row.length - 1; j >= 0; j--) {
            const cell = row[j];
            if (typeof cell === 'number') {
                currentValue = cell;
                break;
            }
            const s = String(cell || '').trim();
            if (/^-?[\d.]*,\d{2}$/.test(s) || /^-?\d+\.\d{2}$/.test(s)) {
                const clean = s.replace(/\./g, '').replace(',', '.').replace(/[R$\s]/g, '');
                currentValue = parseFloat(clean) || 0;
                if (currentValue !== 0) break;
            }
        }

        if (!currentCode || isNaN(currentCode)) continue;
        orderCount++;

        if (!clientData[currentCode]) {
            clientData[currentCode] = { name: currentName, value: 0 };
        }
        clientData[currentCode].value += currentValue;
    }

    const data = Object.keys(clientData).map(code => ({
        clientCode: code,
        clientName: clientData[code].name || nameMapB[code] || 'Cliente Desconhecido',
        totalValue: clientData[code].value,
        city: normalizeCity(cityMap[code])
    }));

    return { periodText, month, year, orderCount, data };
}

module.exports = { parseType2 };
