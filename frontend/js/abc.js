import { FABS, FLAB, FC, MONTHS, MONTH_LABELS, MONTH_COLORS } from './constants.js';
import { fmt } from './utils.js';

let APP_DATA = null;
let abcCompareChart = null;

// Exported State
export const abcState = { mes: 'acum', vendor: 'all', city: 'all', curva: new Set(['A', 'B', 'C']), sort: 'value', sortDir: -1 };
export let abcChartMes = 'acum';

const VENDOR_COLORS_ABC = {
  'Solisnando': '#2563eb', 'Samuel': '#7c3aed', 'Celso': '#0891b2', 'Gregório': '#059669',
  'Jairo': '#d97706', 'Fábio': '#e11d48', 'Ernido': '#0f766e', 'Tiago': '#9333ea', 'Elberto': '#b45309', 'Pablo': '#f59e0b'
};

export function initAbc(appData) {
    APP_DATA = appData;
    updateAbcCityOptions();
    updateAbcChartCityOptions();
    renderAbcTable();
    setTimeout(renderAbcChart, 80);
}

/** Get ABC data key from month key */
function abcKey(mk) {
    return `ABC_${mk.toUpperCase()}`;
}

function getAbcSource() {
  if (!APP_DATA) return null;
  if (abcState.mes === 'acum') return APP_DATA.ABC_ACUM;
  const key = abcKey(abcState.mes);
  return APP_DATA[key] || null;
}

export function getAbcRows() {
  const src = getAbcSource();
  if (!src) return [];
  let rows = [];
  const vendors = abcState.vendor === 'all' ? Object.keys(src) : [abcState.vendor];
  vendors.forEach(vendor => {
    (src[vendor] || []).forEach(c => {
      rows.push({ vendor, name: c.n, value: c.v, city: c.cd, cityKey: c.ck, abc: c.a });
    });
  });
  if (abcState.city !== 'all') rows = rows.filter(r => r.cityKey === abcState.city);
  rows = rows.filter(r => abcState.curva.has(r.abc));
  const q = document.getElementById('abc-search')?.value.trim().toLowerCase();
  if (q) rows = rows.filter(r => r.name.toLowerCase().includes(q) || (r.city || '').toLowerCase().includes(q));
  rows.sort((a, b) => {
    if (abcState.sort === 'name') return abcState.sortDir * a.name.localeCompare(b.name);
    return abcState.sortDir * (a.value - b.value);
  });
  return rows;
}

export function setAbcFilter(type, val, el) {
  if (type === 'mes') {
    abcState.mes = val;
    // Remove active from all month buttons dynamically
    const allBtns = document.querySelectorAll('[id^="abc-mes-"]');
    allBtns.forEach(e => e.classList.remove('active'));
    if (el) el.classList.add('active');
    updateAbcCityOptions();
    updateAbcChartCityOptions();
  } else if (type === 'vendor') {
    abcState.vendor = val;
    updateAbcCityOptions();
    updateAbcChartCityOptions();
  } else if (type === 'city') {
    abcState.city = val;
  }
  renderAbcTable();
}

export function toggleAbcCurva(letter, el) {
  if (abcState.curva.has(letter)) {
    if (abcState.curva.size > 1) { abcState.curva.delete(letter); el.classList.remove('active'); }
  } else {
    abcState.curva.add(letter); el.classList.add('active');
  }
  renderAbcTable();
}

export function sortAbcBy(col) {
  if (abcState.sort === col) abcState.sortDir *= -1;
  else { abcState.sort = col; abcState.sortDir = col === 'value' ? -1 : 1; }
  renderAbcTable();
}

export function updateAbcCityOptions() {
  const src = getAbcSource();
  if (!src) return;
  const sel = document.getElementById('abc-sel-city');
  if (!sel) return;
  const prev = sel.value;
  const vendors = abcState.vendor === 'all' ? Object.keys(src) : [abcState.vendor];
  const cities = new Map();
  vendors.forEach(v => (src[v] || []).forEach(c => { if (c.ck && c.ck !== '*') cities.set(c.ck, c.cd); }));
  const sorted = [...cities.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  sel.innerHTML = '<option value="all">Todas</option>' +
    sorted.map(([k, d]) => `<option value="${k}">${d}</option>`).join('');
  sel.value = cities.has(prev) ? prev : 'all';
  abcState.city = sel.value;
}

export function renderAbcTable() {
  const rows = getAbcRows();
  const total = rows.reduce((a, r) => a + r.value, 0);
  const totalA = rows.filter(r => r.abc === 'A').reduce((a, r) => a + r.value, 0);
  const totalB = rows.filter(r => r.abc === 'B').reduce((a, r) => a + r.value, 0);
  const totalC = rows.filter(r => r.abc === 'C').reduce((a, r) => a + r.value, 0);
  const cntA = rows.filter(r => r.abc === 'A').length;
  const cntB = rows.filter(r => r.abc === 'B').length;
  const cntC = rows.filter(r => r.abc === 'C').length;

  const statsEl = document.getElementById('abc-stats');
  if (statsEl) {
      statsEl.innerHTML = [
        { lbl: 'Total Clientes', val: rows.length.toString(), sub: fmt(total), color: '#2563eb' },
        { lbl: 'Curva A', val: cntA + ' clientes', sub: fmt(totalA), color: '#276221' },
        { lbl: 'Curva B', val: cntB + ' clientes', sub: fmt(totalB), color: '#9C5700' },
        { lbl: 'Curva C', val: cntC + ' clientes', sub: fmt(totalC), color: '#9C0006' },
      ].map(s => `
        <div class="abc-stat" style="border-top:3px solid ${s.color}">
          <div class="abc-stat-val" style="color:${s.color}">${s.val}</div>
          <div class="abc-stat-lbl">${s.lbl}</div>
          <div style="font-size:11px;color:var(--text2);font-family:var(--mono);margin-top:3px">${s.sub}</div>
        </div>`).join('');
  }

  const badge = document.getElementById('abc-badge');
  if (badge) badge.textContent = `${rows.length} clientes · ${fmt(total)}`;

  const tbody = document.getElementById('abc-tbody');
  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="abc-empty">Nenhum cliente encontrado.</td></tr>`;
    const footer = document.getElementById('abc-footer');
    if (footer) footer.textContent = '';
    return;
  }

  tbody.innerHTML = rows.map((r, i) => {
    const vc = VENDOR_COLORS_ABC[r.vendor] || '#64748b';
    return `<tr>
      <td><span class="abc-rank">${i + 1}</span></td>
      <td style="font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.name}">${r.name}</td>
      <td style="font-family:var(--mono);font-weight:700;font-size:11px;color:#0f172a">${fmt(r.value)}</td>
      <td style="color:var(--text2)">${r.city || '—'}</td>
      <td><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;background:${vc}18;color:${vc}">${r.vendor}</span></td>
      <td style="text-align:center"><span class="abc-badge ${r.abc}">${r.abc}</span></td>
    </tr>`;
  }).join('');

  const footer = document.getElementById('abc-footer');
  if (footer) footer.textContent = `Exibindo ${rows.length} clientes · Total: ${fmt(total)}`;
  setTimeout(renderAbcChart, 50);
}

function getClientMonthValues(vendor, name) {
  const result = {};
  MONTHS.forEach(mk => {
    const key = abcKey(mk);
    const clients = APP_DATA[key] ? (APP_DATA[key][vendor] || []) : [];
    result[mk] = clients.find(c => c.n === name)?.v || 0;
  });
  return result;
}

export function setAbcChartMes(mes, el) {
  abcChartMes = mes;
  const allBtns = document.querySelectorAll('[id^="abc-chart-mes-"]');
  allBtns.forEach(e => e.classList.remove('active'));
  if (el) el.classList.add('active');
  updateAbcChartCityOptions();
  renderAbcChart();
}

export function setAbcChartMesNew(mes, el) {
  abcChartMes = mes;
  const labelEl = document.getElementById('abc-chart-mes-label');
  if (labelEl) labelEl.textContent = mes === 'acum' ? 'Acumulado' : (MONTH_LABELS[mes] || mes);
  const menu = document.getElementById('abc-chart-mes-menu');
  if (menu) menu.querySelectorAll('.filt-opt').forEach(e => e.classList.remove('active'));
  if (el) el.classList.add('active');
  if (menu) menu.style.display = 'none';
  updateAbcChartCityOptions();
  renderAbcChart();
}

export function updateAbcChartCityOptions() {
  const sel = document.getElementById('abc-chart-city');
  if (!sel) return;
  const prev = sel.value;
  const cities = new Map();

  if (abcChartMes === 'acum') {
    // Combine all months
    MONTHS.forEach(mk => {
      const src = APP_DATA[abcKey(mk)];
      if (src) Object.values(src).forEach(clients => clients.forEach(c => { if (c.cd && c.ck && c.ck !== '*') cities.set(c.ck, c.cd); }));
    });
  } else {
    const src = APP_DATA[abcKey(abcChartMes)];
    if (src) Object.values(src).forEach(clients => clients.forEach(c => { if (c.cd && c.ck && c.ck !== '*') cities.set(c.ck, c.cd); }));
  }

  const sorted = [...cities.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  sel.innerHTML = '<option value="all">Todas</option>' + sorted.map(([k, d]) => `<option value="${k}">${d}</option>`).join('');
  sel.value = cities.has(prev) ? prev : 'all';
}

export function renderAbcChart() {
  if (!APP_DATA) return;
  const topN = parseInt(document.getElementById('abc-chart-top')?.value || 20);
  const sortBy = document.getElementById('abc-chart-sort')?.value || 'acum';
  const chartCity = document.getElementById('abc-chart-city')?.value || 'all';

  // Get current filtered rows using acum
  const savedMes = abcState.mes;
  abcState.mes = 'acum';
  const acumRows = getAbcRows();
  abcState.mes = savedMes;

  // Enrich with monthly values
  let enriched = acumRows.map(r => {
    const mv = getClientMonthValues(r.vendor, r.name);
    const acum = Object.values(mv).reduce((a, b) => a + b, 0);
    return { ...r, monthValues: mv, acum };
  }).filter(r => chartCity === 'all' || r.ck === chartCity);

  // Apply month filter to acum display value
  if (abcChartMes !== 'acum') {
    enriched = enriched.map(r => ({ ...r, acum: r.monthValues[abcChartMes] || 0 }));
  }

  // Sort
  if (MONTHS.includes(sortBy)) {
    enriched.sort((a, b) => (b.monthValues[sortBy] || 0) - (a.monthValues[sortBy] || 0));
  } else {
    enriched.sort((a, b) => b.acum - a.acum);
  }

  const data = enriched.slice(0, topN);
  const labels = data.map(r => r.name.length > 22 ? r.name.slice(0, 20) + '…' : r.name);

  const canvas = document.getElementById('abc-compare-chart');
  if (!canvas) return;
  canvas.style.height = '400px';

  if (abcCompareChart) abcCompareChart.destroy();

  // Detect active months (months that have any data)
  const activeMonths = MONTHS.filter(mk =>
    data.some(r => (r.monthValues[mk] || 0) > 0)
  );

  let datasets = [];
  if (abcChartMes === 'acum') {
    // Show each active month as a stacked/grouped dataset
    datasets = activeMonths.map((mk, idx) => ({
      label: MONTH_LABELS[mk],
      data: data.map(r => r.monthValues[mk] || 0),
      backgroundColor: MONTH_COLORS[MONTHS.indexOf(mk)] + 'cc',
      borderColor: MONTH_COLORS[MONTHS.indexOf(mk)],
      borderWidth: 1,
      borderRadius: idx === activeMonths.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]
    }));
  } else {
    const idx = MONTHS.indexOf(abcChartMes);
    datasets.push({
      label: MONTH_LABELS[abcChartMes],
      data: data.map(r => r.monthValues[abcChartMes] || 0),
      backgroundColor: MONTH_COLORS[idx] + 'cc',
      borderColor: MONTH_COLORS[idx],
      borderWidth: 1,
      borderRadius: 5
    });
  }

  abcCompareChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      indexAxis: 'x',
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: datasets.length > 1, labels: { color: '#475569', font: { family: 'JetBrains Mono', size: 10 }, padding: 14 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}`
          },
          backgroundColor: '#0f172a', titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 12, borderColor: '#334155', borderWidth: 1
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 9 }, maxRotation: 45, minRotation: 30 } },
        y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 9 }, callback: v => 'R$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) } }
      }
    }
  });

  const sub = document.getElementById('abc-chart-sub');
  if (sub) sub.textContent = `MOSTRANDO TOP ${Math.min(topN, data.length)} DE ${enriched.length} CLIENTES · ORDENADO POR ${(MONTH_LABELS[sortBy] || sortBy).toUpperCase()}`;

  const legend = document.getElementById('abc-chart-legend');
  if (legend) {
    if (abcChartMes === 'acum') {
      legend.innerHTML = activeMonths.map(mk => {
        const total = data.reduce((a, r) => a + (r.monthValues[mk] || 0), 0);
        const idx = MONTHS.indexOf(mk);
        return `<div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;border-radius:3px;background:${MONTH_COLORS[idx]}"></div><span style="font-size:11px;font-weight:600;color:var(--text2)">${MONTH_LABELS[mk]}: <span style="font-family:var(--mono);color:#0f172a">${fmt(total)}</span></span></div>`;
      }).join('');
    } else {
      const total = data.reduce((a, r) => a + (r.monthValues[abcChartMes] || 0), 0);
      const idx = MONTHS.indexOf(abcChartMes);
      legend.innerHTML = `<div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;border-radius:3px;background:${MONTH_COLORS[idx]}"></div><span style="font-size:11px;font-weight:600;color:var(--text2)">${MONTH_LABELS[abcChartMes]}: <span style="font-family:var(--mono);color:#0f172a">${fmt(total)}</span></span></div>`;
    }
  }
}
