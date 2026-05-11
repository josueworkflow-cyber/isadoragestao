const XLSX = require('xlsx');
const { mapping, defaultFactory } = require('../config/suppliers');

/**
 * Parse Type 1 Excel: "Vendas por Fornecedor"
 * @param {Buffer} buffer 
 * @returns {Object} { periodText, periodStart, periodEnd, month, week, year, data }
 */
function parseType1(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    // Try to find the first non-empty sheet
    let sheet = null;
    let sheetName = '';
    
    for (const name of workbook.SheetNames) {
        const s = workbook.Sheets[name];
        const range = XLSX.utils.decode_range(s['!ref'] || 'A1:A1');
        if (range.e.r > 2) { // At least 3 rows
            sheet = s;
            sheetName = name;
            break;
        }
    }
    
    if (!sheet) {
        sheetName = workbook.SheetNames[0];
        sheet = workbook.Sheets[sheetName];
    }
    
    // Get all rows as arrays
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    if (rows.length < 3) {
        throw new Error(`A planilha "${sheetName}" está vazia ou tem poucas linhas. Verifique se o arquivo está no formato correto.`);
    }

    // Line 2 (index 1) has the period: "06/04/2026 à 10/04/2026"
    const periodRow = rows[1];
    const periodText = periodRow.find(cell => String(cell).includes('à')) || '';
    
    let periodStart = null;
    let periodEnd = null;
    let month = 1;
    let year = 2026;
    let week = 1;

    if (periodText) {
        const matches = periodText.match(/(\d{2}\/\d{2}\/\d{4})/g);
        if (matches && matches.length >= 2) {
            const [startStr, endStr] = matches;
            const [d1, m1, y1] = startStr.split('/').map(Number);
            const [d2, m2, y2] = endStr.split('/').map(Number);
            
            periodStart = new Date(y1, m1 - 1, d1);
            periodEnd = new Date(y2, m2 - 1, d2);
            month = m1;
            year = y1;
            
            // Calculate week (simple heuristic: day of month / 7)
            week = Math.ceil(d1 / 7);
            if (week > 5) week = 5;
        }
    }

    const data = [];
    // Data starts from index 3 or 4 usually, let's look for header
    let headerIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const rowStr = rows[i].join('|').toUpperCase();
        // A real header row should have at least two of these
        let matches = 0;
        if (rowStr.includes('CÓD') || rowStr.includes('COD')) matches++;
        if (rowStr.includes('NOME') || rowStr.includes('FORNECEDOR')) matches++;
        if (rowStr.includes('VALOR') || rowStr.includes('VLR') || rowStr.includes('TOTAL')) matches++;
        
        if (matches >= 2) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
        console.log('FALHA: Cabeçalho não encontrado. Primeiras 5 linhas:', rows.slice(0, 5));
        throw new Error('Não foi possível encontrar o cabeçalho dos dados (ex: "Cód.For." ou "Nome"). Verifique se a planilha está no formato correto.');
    }

    const headerRow = rows[headerIndex];
    console.log(`Linha de cabeçalho detectada (index ${headerIndex}):`, headerRow);
    console.log(`Total de linhas no array rows: ${rows.length}`);

    const colMap = {
        code: headerRow.findIndex(c => /Cód|Cod|Código/i.test(String(c))),
        name: headerRow.findIndex(c => /Fornecedor|Nome|Razão/i.test(String(c))),
        value: headerRow.findIndex(c => /Vlr|Líq|Total|Valor|Venda/i.test(String(c)))
    };

    console.log('[PARSER-V4] Mapeamento de colunas detectado:', colMap);
    console.log(`Processando Tipo 1 a partir da linha ${headerIndex + 1}...`);

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        console.log(`Processando linha ${i}:`, row);
        
        // Dynamic search for code and value if indices are shifted or empty
        let supplierCode = String(row[colMap.code] || '').trim();
        // If code is empty, check the next column (common in merged cells/offset)
        if (!supplierCode && colMap.code !== -1) supplierCode = String(row[colMap.code + 1] || '').trim();
        
        const supplierName = String(row[colMap.name] || '').trim();
        
        // Skip if code is empty or if it's a total/footer row
        if (!supplierCode || supplierName.toUpperCase().includes('TOTAL') || supplierName.toUpperCase().includes('PÁG.')) continue;

        let rawValue = row[colMap.value];
        // If value is empty, check previous column (sometimes happens with Total)
        if ((rawValue === undefined || rawValue === '') && colMap.value > 0) rawValue = row[colMap.value - 1];

        let value = 0;
        if (typeof rawValue === 'number') {
            value = rawValue;
        } else {
            const valueStr = String(rawValue || '0').replace(/[R$\s.]/g, '').replace(',', '.');
            value = parseFloat(valueStr) || 0;
        }

        const factoryKey = mapping[supplierName] || defaultFactory;

        data.push({
            supplierCode,
            supplierName,
            factoryKey,
            value
        });
    }

    console.log(`Fim do processamento Tipo 1. Registros encontrados: ${data.length}`);

    return {
        periodText,
        periodStart,
        periodEnd,
        month,
        week,
        year,
        data
    };
}

module.exports = { parseType1 };
