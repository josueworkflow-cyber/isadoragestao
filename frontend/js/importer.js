/**
 * Excel Importer Module
 */
import { FABS, FLAB, FC } from './constants.js';

let importedWorkbook = null;
let importedData = {};

export function downloadTemplate() {
  if (typeof XLSX === 'undefined') { alert('Aguarde o carregamento da biblioteca de Excel.'); return; }
  const wb = XLSX.utils.book_new();

  // Aba 1: Vendas_Fabricante
  const vendas = [
    ['Vendedor','Fabricante','Jan_Realizado','Fev_Realizado','Meta_Mensal','Meta_Anual'],
    ['solisnando','pian',105176.46,106696.75,93662.84,1123954.08],
    ['solisnando','erva',105517.19,108001.46,122691.23,1472294.72],
    ['solisnando','nutri',44649.73,37886.61,47429.90,569158.77],
    ['solisnando','mek',39470.64,45961.27,0,0],
    ['solisnando','total',323337.41,324139.72,311934.26,3743211.08],
    ['samuel','pian',201776.97,205305.94,220617.78,2647413.34],
    ['samuel','erva',31064.80,34477.12,37258.35,447100.21],
    ['samuel','nutri',13769.92,16268.35,16081.86,192982.29],
    ['samuel','mek',8533.59,4055.85,0,0],
    ['samuel','total',267673.15,275327.04,292738.89,3512866.64],
    ['celso','pian',177752.94,141347.31,177686.53,2132238.39],
    ['celso','erva',23206.02,19864.79,26987.76,323853.10],
    ['celso','nutri',27056.50,24288.00,27794.49,333533.89],
    ['celso','mek',10851.84,8108.61,0,0],
    ['celso','total',259835.95,203220.88,251300.85,3015610.17],
    ['gregorio','pian',75991.96,40213.10,58005.95,696071.34],
    ['gregorio','erva',9561.80,8248.81,8768.80,105225.58],
    ['gregorio','nutri',60105.49,52338.19,68071.59,816859.11],
    ['gregorio','mek',10649.01,6927.05,0,0],
    ['gregorio','total',171366.59,121659.64,163244.14,1958929.69],
    ['jairo','pian',76259.34,65877.68,98654.28,1183851.32],
    ['jairo','erva',24021.25,26798.92,29592.72,355112.69],
    ['jairo','nutri',4217.95,3423.14,4302.30,51627.65],
    ['jairo','mek',430.96,385.14,0,0],
    ['jairo','total',121291.13,110756.99,152095.32,1825143.87],
    ['fabio','pian',11608.03,21734.70,23454.66,281455.91],
    ['fabio','erva',21408.38,21955.37,26468.60,317623.14],
    ['fabio','nutri',24844.48,31647.95,44056.67,528680.02],
    ['fabio','mek',4410.90,3599.72,0,0],
    ['fabio','total',73198.34,88503.50,113270.89,1359250.66],
    ['ernido','pian',11391.24,9801.75,14263.62,171163.48],
    ['ernido','erva',2240.67,2440.63,2101.02,25212.19],
    ['ernido','nutri',305.47,206.56,0,0],
    ['ernido','mek',74756.78,70837.68,75622.01,907464.12],
    ['ernido','total',91508.61,84856.00,96012.65,1152151.76],
    ['tiago','pian',4707.69,8283.32,8315.54,99786.50],
    ['tiago','erva',11885.47,22655.54,18783.17,225398.00],
    ['tiago','nutri',2815.35,1881.57,0,0],
    ['tiago','mek',32272.13,20617.25,32617.18,391406.21],
    ['tiago','total',53627.12,56766.67,71512.94,858155.23],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vendas), 'Vendas_Fabricante');

  // Aba 2: Pedidos_Vendedor
  const pedidos = [
    ['Vendedor','Pedidos_Jan','Pedidos_Fev'],
    ['solisnando',332,329],
    ['samuel',113,109],
    ['celso',295,253],
    ['gregorio',213,191],
    ['jairo',148,148],
    ['fabio',141,136],
    ['ernido',107,103],
    ['tiago',53,57],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pedidos), 'Pedidos_Vendedor');

  // Aba 3: Clientes_ABC
  const abc = [
    ['Vendedor','Nome_Cliente','Valor','Cidade_Key','Cidade_Nome','Curva','Mes'],
    ['Solisnando','CLAUDIO SERPA SILVA JUNIO',13316.11,'ARROIO GRANDE','Arroio Grande','A','jan'],
    ['Solisnando','GLECI MELO DA MOTTA',9901.97,'HERVAL','Herval','A','jan'],
    ['Samuel','SUPERMERCADO MILANOSUL LT',17310.16,'SANTA VITORIA','Santa Vitória do Palmar','A','jan'],
    ['Samuel','LANGONI E SILVA LTDA',17067.05,'SANTA VITORIA','Santa Vitória do Palmar','A','jan'],
    ['-- Adicione mais linhas abaixo --','','','','','',''],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(abc), 'Clientes_ABC');

  // Aba 4: Geo_Cidades
  const geo = [
    ['Cidade','Key','Lat','Lng','Mes','Vendedor_Key','Vendedor_Label','Vendedor_Cor','Valor_Vendedor','Nome_Cliente','Valor_Cliente'],
    ['Pelotas','PELOTAS',-31.7654,-52.3376,'jan','solisnando','Solisnando','#2563eb',135145.92,'MARCO ANTONIO LETTENIN',5398.06],
    ['Pelotas','PELOTAS',-31.7654,-52.3376,'jan','solisnando','Solisnando','#2563eb',135145.92,'BRUNA UGOSKI ESLABAO',5305.10],
    ['Rio Grande','RIO GRANDE',-32.035,-52.0986,'jan','ernido','Ernido','#0f766e',91508.61,'CRISTIAN CHAVES MARTINS',5715.06],
    ['-- Adicione mais linhas abaixo --','','','','','','','','','',''],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(geo), 'Geo_Cidades');

  // Instrucoes
  const inst = [
    ['INSTRUÇÕES DE PREENCHIMENTO'],
    [''],
    ['Aba Vendas_Fabricante:'],
    ['  - Vendedor: chave do vendedor (solisnando, samuel, celso, gregorio, jairo, fabio, ernido, tiago)'],
    ['  - Fabricante: pian, erva, nutri, mek OU total'],
    ['  - Valores em R$ (número sem símbolo)'],
    [''],
    ['Aba Pedidos_Vendedor:'],
    ['  - Pedidos_Jan e Pedidos_Fev: quantidade de pedidos por mês'],
    [''],
    ['Aba Clientes_ABC:'],
    ['  - Mes: jan ou fev'],
    ['  - Curva: A, B ou C'],
    ['  - Preencha uma linha por cliente por mês'],
    [''],
    ['Aba Geo_Cidades:'],
    ['  - Mes: jan ou fev'],
    ['  - Preencha uma linha por cliente (agrupadas por cidade/vendedor)'],
    ['  - Lat/Lng: coordenadas geográficas da cidade'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inst), 'INSTRUCOES');

  XLSX.writeFile(wb, 'Modelo_Dashboard_Comercial.xlsx');
}

export function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  document.getElementById('import-errors').style.display = 'none';
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('btn-apply-import').style.display = 'none';

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      importedWorkbook = XLSX.read(data, { type: 'array' });
      importedData = {};
      importedWorkbook.SheetNames.forEach(name => {
        importedData[name] = XLSX.utils.sheet_to_json(importedWorkbook.Sheets[name], { defval: '' });
      });
      showImportPreview(file.name);
    } catch(err) {
      showImportError('Erro ao ler o arquivo: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}

function showImportPreview(filename) {
  document.getElementById('import-filename').textContent = filename;
  document.getElementById('import-preview').style.display = 'block';

  const tabs = document.getElementById('import-tabs');
  tabs.innerHTML = '';
  const sheets = Object.keys(importedData).filter(n => n !== 'INSTRUCOES');
  sheets.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.textContent = name + ' (' + importedData[name].length + ' linhas)';
    btn.style.cssText = 'padding:5px 12px;border-radius:20px;border:none;cursor:pointer;font-size:11px;font-weight:700;font-family:var(--font);' +
      (i===0 ? 'background:#2563eb;color:#fff' : 'background:var(--surface2);color:var(--text2);border:1px solid var(--border2)');
    btn.onclick = () => {
      tabs.querySelectorAll('button').forEach(b => { b.style.background='var(--surface2)'; b.style.color='var(--text2)'; b.style.border='1px solid var(--border2)'; });
      btn.style.background='#2563eb'; btn.style.color='#fff'; btn.style.border='none';
      renderImportTable(name);
    };
    tabs.appendChild(btn);
    if (i === 0) renderImportTable(name);
  });

  let sumHtml = '';
  if (importedData['Vendas_Fabricante']) sumHtml += '✔ Vendas_Fabricante: ' + importedData['Vendas_Fabricante'].length + ' registros &nbsp;';
  if (importedData['Pedidos_Vendedor'])  sumHtml += '✔ Pedidos_Vendedor: ' + importedData['Pedidos_Vendedor'].length + ' registros &nbsp;';
  if (importedData['Clientes_ABC'])      sumHtml += '✔ Clientes_ABC: ' + importedData['Clientes_ABC'].length + ' registros &nbsp;';
  if (importedData['Geo_Cidades'])       sumHtml += '✔ Geo_Cidades: ' + importedData['Geo_Cidades'].length + ' registros';
  document.getElementById('import-summary').innerHTML = sumHtml;
  document.getElementById('btn-apply-import').style.display = 'inline-flex';
}

function renderImportTable(sheetName) {
  const rows = importedData[sheetName];
  if (!rows || rows.length === 0) { document.getElementById('import-table-wrap').innerHTML = '<p style="padding:12px;color:var(--text3);font-size:12px">Aba vazia.</p>'; return; }
  const cols = Object.keys(rows[0]);
  let html = '<table style="width:100%;border-collapse:collapse;font-size:11px;font-family:var(--mono)">';
  html += '<thead><tr>' + cols.map(c => `<th style="padding:7px 10px;background:#0f172a;color:#fff;text-align:left;white-space:nowrap">${c}</th>`).join('') + '</tr></thead><tbody>';
  rows.slice(0, 50).forEach((row, i) => {
    html += `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">` + cols.map(c => `<td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap">${row[c]}</td>`).join('') + '</tr>';
  });
  if (rows.length > 50) html += `<tr><td colspan="${cols.length}" style="padding:8px 10px;color:var(--text3);text-align:center">... e mais ${rows.length-50} linhas</td></tr>`;
  html += '</tbody></table>';
  document.getElementById('import-table-wrap').innerHTML = html;
}

function showImportError(msg) {
  const el = document.getElementById('import-errors');
  el.style.display = 'block';
  el.innerHTML = '❌ ' + msg;
}

export function applyImport(APP_DATA, onComplete) {
  if (!importedData) return;
  let changed = 0;
  const errors = [];
  const { D, VND_LIST, ABC_JAN, ABC_FEV, ABC_MAR, GEO_JAN, GEO_FEV } = APP_DATA;

  // 1. Vendas por Fabricante → objeto D
  if (importedData['Vendas_Fabricante'] && importedData['Vendas_Fabricante'].length > 0) {
    try {
      importedData['Vendas_Fabricante'].forEach(row => {
        const vkey = String(row['Vendedor']||'').toLowerCase().trim();
        const fab  = String(row['Fabricante']||'').toLowerCase().trim();
        if (!vkey || !fab) return;
        if (!D[vkey]) return;
        if (!D[vkey][fab]) D[vkey][fab] = {jan:0, fev:0, mm:0, ma:0};
        const jan = parseFloat(String(row['Jan_Realizado']||'0').replace(',','.')) || 0;
        const fev = parseFloat(String(row['Fev_Realizado']||'0').replace(',','.')) || 0;
        const mar = parseFloat(String(row['Mar_Realizado']||'0').replace(',','.')) || 0;
        const mm  = parseFloat(String(row['Meta_Mensal']||'0').replace(',','.'))  || 0;
        const ma  = parseFloat(String(row['Meta_Anual']||'0').replace(',','.'))   || 0;
        D[vkey][fab].jan = jan;
        D[vkey][fab].fev = fev;
        D[vkey][fab].mar = mar;
        D[vkey][fab].mm  = mm;
        D[vkey][fab].ma  = ma;
        changed++;
      });
    } catch(e) { errors.push('Vendas_Fabricante: ' + e.message); }
  }

  // 2. Pedidos por Vendedor → VND_LIST
  if (importedData['Pedidos_Vendedor'] && importedData['Pedidos_Vendedor'].length > 0) {
    try {
      importedData['Pedidos_Vendedor'].forEach(row => {
        const vkey = String(row['Vendedor']||'').toLowerCase().trim();
        const vnd  = VND_LIST.find(v => v.k === vkey);
        if (!vnd) return;
        const pj = parseInt(String(row['Pedidos_Jan']||'0')) || 0;
        const pf = parseInt(String(row['Pedidos_Fev']||'0')) || 0;
        const pm = parseInt(String(row['Pedidos_Mar']||'0')) || 0;
        vnd.pj = pj;
        vnd.pf = pf;
        vnd.pm = pm;
        changed++;
      });
    } catch(e) { errors.push('Pedidos_Vendedor: ' + e.message); }
  }

  // 3. Clientes ABC
  if (importedData['Clientes_ABC'] && importedData['Clientes_ABC'].length > 0) {
    try {
      const newJan = {}, newFev = {}, newMar = {};
      importedData['Clientes_ABC'].forEach(row => {
        const vend  = String(row['Vendedor']||'').trim();
        const nome  = String(row['Nome_Cliente']||'').trim();
        const valor = parseFloat(String(row['Valor']||'0').replace(',','.')) || 0;
        const ck    = String(row['Cidade_Key']||'').trim();
        const cd    = String(row['Cidade_Nome']||'').trim();
        const curva = String(row['Curva']||'B').trim().toUpperCase();
        const mes   = String(row['Mes']||'jan').toLowerCase().trim();
        if (!vend || !nome) return;
        const obj   = {n: nome, v: valor, ck: ck, cd: cd, a: curva};
        if (mes === 'jan') {
          if (!newJan[vend]) newJan[vend] = [];
          newJan[vend].push(obj);
        } else if (mes === 'fev') {
          if (!newFev[vend]) newFev[vend] = [];
          newFev[vend].push(obj);
        } else if (mes === 'mar') {
          if (!newMar[vend]) newMar[vend] = [];
          newMar[vend].push(obj);
        }
        changed++;
      });
      if (Object.keys(newJan).length > 0) Object.assign(ABC_JAN, newJan);
      if (Object.keys(newFev).length > 0) Object.assign(ABC_FEV, newFev);
      if (Object.keys(newMar).length > 0) Object.assign(ABC_MAR, newMar);
    } catch(e) { errors.push('Clientes_ABC: ' + e.message); }
  }

  // 4. Dados Geográficos
  if (importedData['Geo_Cidades'] && importedData['Geo_Cidades'].length > 0) {
    try {
      const buildGeo = (mes) => {
        const rows = importedData['Geo_Cidades'].filter(r => String(r['Mes']||'').toLowerCase().trim() === mes);
        if (rows.length === 0) return null;
        const cityMap = {};
        rows.forEach(r => {
          const ckey   = String(r['Key']||'').trim();
          const cname  = String(r['Cidade']||'').trim();
          const lat    = parseFloat(String(r['Lat']||'0').replace(',','.')) || 0;
          const lng    = parseFloat(String(r['Lng']||'0').replace(',','.')) || 0;
          const vkey   = String(r['Vendedor_Key']||'').trim();
          const vlab   = String(r['Vendedor_Label']||'').trim();
          const vcor   = String(r['Vendedor_Cor']||'#2563eb').trim();
          const vval   = parseFloat(String(r['Valor_Vendedor']||'0').replace(',','.')) || 0;
          const cln    = String(r['Nome_Cliente']||'').trim();
          const clv    = parseFloat(String(r['Valor_Cliente']||'0').replace(',','.')) || 0;
          if (!ckey) return;
          if (!cityMap[ckey]) cityMap[ckey] = {city:cname, key:ckey, lat:lat, lng:lng, total:0, vendors:[]};
          let vnd = cityMap[ckey].vendors.find(v => v.key === vkey);
          if (!vnd) { vnd = {key:vkey, label:vlab, color:vcor, value:vval, clients:[]}; cityMap[ckey].vendors.push(vnd); }
          if (cln) vnd.clients.push({name:cln, value:clv});
        });
        const arr = Object.values(cityMap);
        arr.forEach(city => {
          city.total = city.vendors.reduce((s,v) => s + v.value, 0);
        });
        return arr;
      };
      const geoJan = buildGeo('jan');
      const geoFev = buildGeo('fev');
      if (geoJan && geoJan.length > 0) {
        GEO_JAN.length = 0;
        geoJan.forEach(c => GEO_JAN.push(c));
      }
      if (geoFev && geoFev.length > 0) {
        GEO_FEV.length = 0;
        geoFev.forEach(c => GEO_FEV.push(c));
      }
      changed++;
    } catch(e) { errors.push('Geo_Cidades: ' + e.message); }
  }

  if (errors.length > 0) {
    showImportError('Alguns problemas foram encontrados:<br>' + errors.join('<br>'));
  }

  if (changed > 0) {
    document.getElementById('modal-import').style.display = 'none';
    if (onComplete) onComplete();
    alert('✅ ' + changed + ' registros importados com sucesso!\\n\\nO dashboard foi atualizado.');
  } else {
    showImportError('Nenhum dado válido encontrado. Verifique se as abas estão corretas conforme o modelo.');
  }
}
