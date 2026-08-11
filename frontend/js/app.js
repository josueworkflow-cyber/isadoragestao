/**
 * Main Application Module
 * Fully dynamic — supports all 12 months.
 */

import { loadAllData } from './data-loader.js';
import { FABS, FLAB, FC, FAB_LOGOS, MONTHS, MONTH_LABELS, EMPRESAS_INFO } from './constants.js';
import { fmt, pN, pS, scColor, scBg, scLabel } from './utils.js';
import { gv, gm, getMonthRange } from './data-helpers.js';
import { goPage, toggleFilter, openModal, closeModal } from './ui.js';
import { initMap, renderMapMarkers } from './map-engine.js';
import { initAbc, setAbcFilter, toggleAbcCurva, sortAbcBy, setAbcChartMes, setAbcChartMesNew } from './abc.js';
import { initReport, openReport, toggleReportVendor, setRptMes, generateReport, generateExcelReport } from './report.js';
import { initEdit, openEdit, renderEditTable, applyEditChanges } from './edit.js';
import { renderResumo } from './summary.js';
import { initImportPage } from './import-manager.js';

// --- Application State ---
let APP_DATA = null;
let vendorCharts = {};
let resumoBarChart = null;
let resumoDonutChart = null;
let fabBarChart = null;
let abcCompareChart = null;

// Global filter states
let mesState = {};
let fabFilterState = {};
let mesResumo = 'all';
let resumoMode = 'abs';
let abcChartMes = 'all';
let activeMapVendor = 'all';

// --- Initialization ---
async function init() {
    // Attach global functions to window IMMEDIATELY so buttons work right away
    window.goPage = (pid) => {
        goPage(pid);
        handlePageRender(pid);
    };
    window.toggleFilter = toggleFilter;
    window.selectMes = selectMes;
    window.selectFab = selectFab;
    window.setResumoMes = setResumoMes;
    window.toggleResumoMode = toggleResumoMode;
    window.setAbcChartMes = setAbcChartMes;
    window.setAbcChartMesNew = setAbcChartMesNew;
    window.setAbcFilter = setAbcFilter;
    window.toggleAbcCurva = toggleAbcCurva;
    window.sortAbcBy = sortAbcBy;
    window.setMapMes = (m) => setMapMes(m);
    window.filterMapVendor = (v, el) => filterMapVendor(v, el);
    window.toggleMobileSidebar = () => document.querySelector('.sidebar').classList.add('mob-open');
    window.closeMobileSidebar = () => document.querySelector('.sidebar').classList.remove('mob-open');
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.openReport = openReport;
    window.toggleReportVendor = toggleReportVendor;
    window.setRptMes = setRptMes;
    window.generateReport = generateReport;
    window.generateExcelReport = generateExcelReport;
    window.openEdit = openEdit;
    window.renderEditTable = renderEditTable;
    window.applyEditChanges = applyEditChanges;

    // Chart.js Global Defaults
    if (window.Chart) {
        Chart.defaults.font.family = "'Outfit', sans-serif";
        Chart.defaults.color = '#475569';
        Chart.defaults.plugins.tooltip.padding = 10;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
    }

    // Now load data
    APP_DATA = await loadAllData();
    if (!APP_DATA) {
        alert("Erro ao carregar dados da aplicação.");
        return;
    }
    window.APP_DATA = APP_DATA;

    // Init modules
    initAbc(APP_DATA);
    initReport(APP_DATA);
    initEdit(APP_DATA);
    initImportPage();

    // Global refresh
    window.refreshAppData = async () => {
        APP_DATA = await loadAllData();
        initAbc(APP_DATA);
        initEdit(APP_DATA);
        handlePageRender(window.currentPageId || 'solisnando');
    };

    // Initial navigation
    window.currentPageId = 'solisnando';
    window.goPage('solisnando');
    console.log('Aplicação inicializada na página:', window.currentPageId);
}

function toggleMobileSidebar() {
    document.querySelector('.sidebar').classList.add('mob-open');
    const ov = document.getElementById('mob-overlay');
    if (ov) ov.style.display = 'block';
}

function closeMobileSidebar() {
    document.querySelector('.sidebar').classList.remove('mob-open');
    const ov = document.getElementById('mob-overlay');
    if (ov) ov.style.display = 'none';
}

function handlePageRender(pid) {
    if (!APP_DATA) return;
    const { VND_LIST } = APP_DATA;

    if (VND_LIST.some(v => v.k === pid)) {
        renderVendorPage(pid);
    } else if (pid === 'resumo') {
        const charts = renderResumo(APP_DATA, mesResumo, resumoMode, resumoBarChart, resumoDonutChart, fabBarChart);
        resumoBarChart = charts.resumoBarChart;
        resumoDonutChart = charts.resumoDonutChart;
        fabBarChart = charts.fabBarChart;
    } else if (pid === 'abc') {
        initAbc(APP_DATA);
    } else if (pid === 'mapa') {
        initMap('leaflet-map');
        window.updateMapFilters();
    } else if (pid === 'import') {
        initImportPage();
    }
}

// --- Rendering Functions ---

export function renderVendorPage(vkey) {
    const { D, VND_LIST } = APP_DATA;
    const m = mesState[vkey] || 'all';
    const fabF = fabFilterState[vkey] || 'all';
    const vinfo = VND_LIST.find(x => x.k === vkey);
    const c = vinfo?.c || '#64748b';
    const src = fabF === 'all' ? (D[vkey]?.total || {}) : (D[vkey]?.[fabF] || {});

    const subTitle = document.querySelector(`#vpage-${vkey} .topbar-sub`);
    const fabLabels = { all: '', pian: ' · PIAN', nutri: ' · NUTRI', erva: ' · PANTANAL', mek: ' · MEK', outros: ' · OUTROS' };
    const fabSuffix = fabLabels[fabF] || '';
    
    let periodLabel = '';
    if (m === 'all') {
        periodLabel = 'Acumulado';
    } else if (typeof m === 'object') {
        periodLabel = `${MONTH_LABELS[m.s]} — ${MONTH_LABELS[m.e]}`;
    } else {
        periodLabel = MONTH_LABELS[m] || m;
    }

    if (subTitle) subTitle.textContent = `VENDEDOR · RELATÓRIO INDIVIDUAL ${periodLabel.toUpperCase()} 2026${fabSuffix}`;

    // Dynamic value computation
    const realNow = gv(D, vkey, fabF === 'all' ? 'total' : fabF, m);
    const metaNow = gm(D, vkey, fabF === 'all' ? 'total' : fabF, m);
    const p = pN(realNow, metaNow);
    const gap = metaNow > 0 ? Math.max(0, metaNow - realNow) : 0;

    // Pedidos — dynamic
    const pedKey = { jan:'pj', fev:'pf', mar:'pm', abr:'pa', mai:'pmai', jun:'pjun', jul:'pjul', ago:'pago', set:'pset', out:'pout', nov:'pnov', dez:'pdez' };
    let ped = 0;
    if (m === 'all') {
        ped = Object.values(pedKey).reduce((s, pk) => s + (vinfo?.[pk] || 0), 0);
    } else if (typeof m === 'object') {
        const range = getMonthRange(m.s, m.e);
        ped = range.reduce((s, mk) => s + (vinfo?.[pedKey[mk]] || 0), 0);
    } else {
        ped = vinfo?.[pedKey[m]] || 0;
    }

    // KPIs
    const kpis = [
        { l: 'Faturamento', v: fmt(realNow), s: periodLabel + ' 2026' + fabSuffix, c: c, bar: null },
        { l: 'Meta Período', v: metaNow > 0 ? fmt(metaNow) : '—', s: 'meta definida' + fabSuffix, c: '#7c3aed', bar: null },
        { l: '% Meta', v: p !== null ? p.toFixed(1) + '%' : '—', s: scLabel(p) + fabSuffix, c: scColor(p), bar: p },
        { l: 'Gap de Meta', v: gap > 0 ? fmt(gap) : 'R$ 0,00', s: 'necessário' + fabSuffix, c: '#e11d48', bar: null },
        { l: 'Pedidos', v: ped.toString(), s: periodLabel, c: '#0891b2', bar: null },
    ];

    const kpiContainer = document.getElementById('kpi-' + vkey);
    if (kpiContainer) {
        kpiContainer.innerHTML = kpis.map((k, i) => `
            <div class="kpi" style="--kc:${k.c};animation-delay:${i * .05}s">
                <div class="kpi-lbl">${k.l}</div>
                <div class="kpi-val" style="color:${k.c}">${k.v}</div>
                <div class="kpi-sub">${k.s}</div>
                ${k.bar !== null ? `<div class="prog-bg"><div class="prog-fill" style="width:${Math.min(100, Math.max(0, k.bar))}%;background:${k.c}"></div></div>` : ''}
            </div>`).join('');
    }

    // Update top badge (Always show total accumulated)
    const badgeEl = document.getElementById('badge-' + vkey);
    if (badgeEl) {
        const totalPed = Object.values(pedKey).reduce((s, pk) => s + (vinfo?.[pk] || 0), 0);
        badgeEl.textContent = `${totalPed} pedidos`;
    }

    // Charts — dynamic months
    renderVendorCharts(vkey, c, src, fabF, m);
    renderFabDetail(vkey, m);
    renderFabTable(vkey, m, fabF);
}

function renderVendorCharts(vkey, c, src, fabF, m) {
    const { D } = APP_DATA;
    vendorCharts[vkey] = vendorCharts[vkey] || {};

    // Detect active months
    const activeMonths = MONTHS.filter(mk => (src[mk] || 0) > 0);
    // If no active months, show at least jan-current
    const displayMonths = activeMonths.length > 0 ? activeMonths : MONTHS.slice(0, new Date().getMonth() + 1);
    const mm = src.mm || 0;

    // Bar Chart
    if (vendorCharts[vkey].bar) vendorCharts[vkey].bar.destroy();
    const bCtx = document.getElementById('bar-' + vkey)?.getContext('2d');
    if (bCtx) {
        vendorCharts[vkey].bar = new Chart(bCtx, {
            type: 'bar',
            data: {
                labels: displayMonths.map(mk => MONTH_LABELS[mk]),
                datasets: [
                    { label: 'Realizado', data: displayMonths.map(mk => src[mk] || 0), backgroundColor: c + 'bb', borderColor: c, borderWidth: 2, borderRadius: 6, order: 1 },
                    { label: 'Meta Mês', data: displayMonths.map(mk => gm(D, vkey, fabF === 'all' ? 'total' : fabF, mk)), type: 'line', borderColor: '#dc2626', borderWidth: 2, borderDash: [6, 4], pointRadius: 0, backgroundColor: 'transparent', order: 0 },
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#475569', font: { family: 'JetBrains Mono', size: 10 } } },
                    tooltip: { callbacks: { label: c2 => ' ' + fmt(c2.raw) } }
                },
                scales: {
                    x: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b' } },
                    y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', callback: v => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) } }
                }
            }
        });
    }

    // Donut Chart
    if (vendorCharts[vkey].donut) vendorCharts[vkey].donut.destroy();
    const dCtx = document.getElementById('donut-' + vkey)?.getContext('2d');
    if (dCtx) {
        const activeFabs = fabF === 'all' ? FABS : [fabF];
        const fabData = activeFabs.map(f => gv(D, vkey, f, m));
        const gt = fabData.reduce((a, b) => a + b, 0);

        vendorCharts[vkey].donut = new Chart(dCtx, {
            type: 'doughnut',
            data: {
                labels: activeFabs.map(f => FLAB[FABS.indexOf(f)]),
                datasets: [{ data: fabData, backgroundColor: activeFabs.map(f => FC[f] + 'cc'), borderColor: activeFabs.map(f => FC[f]), borderWidth: 2, hoverOffset: 6 }]
            },
            options: {
                responsive: true,
                cutout: '62%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#475569', font: { family: 'JetBrains Mono', size: 9 }, padding: 8 } },
                    tooltip: { callbacks: { label: c2 => ` ${fmt(c2.raw)} (${gt > 0 ? (c2.raw / gt * 100).toFixed(1) : 0}%)` } }
                }
            }
        });
    }
}

function renderFabDetail(vkey, m) {
    const { FABRICAS_DETAIL } = APP_DATA;
    const detailEl = document.getElementById('fab-detail-' + vkey);
    if (!detailEl) return;
    
    const vendData = FABRICAS_DETAIL[vkey] || {};
    let totalAll = 0;
    const items = [];
    
    for (const [sn, info] of Object.entries(EMPRESAS_INFO)) {
        const supData = vendData[sn] || {};
        let val = 0;
        if (m === 'all') {
            val = MONTHS.reduce((sum, mk) => sum + (supData[mk] || 0), 0);
        } else if (typeof m === 'object' && m.s && m.e) {
            val = getMonthRange(m.s, m.e).reduce((sum, mk) => sum + (supData[mk] || 0), 0);
        } else {
            val = supData[m] || 0;
        }
        
        if (val > 0) {
            items.push({ sn, info, val });
            totalAll += val;
        }
    }
    
    if (items.length === 0) {
        detailEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px">Nenhum faturamento registrado no período.</div>';
        return;
    }
    
    items.sort((a, b) => b.val - a.val);
    const maxVal = items[0].val;
    
    let html = '<table class="fab-detail-table"><thead><tr><th>Empresa / Produto</th><th>Participação</th><th>Valor Realizado</th></tr></thead><tbody>';
    
    items.forEach(item => {
        const p = (item.val / totalAll) * 100;
        const width = (item.val / maxVal) * 100;
        const color = item.info.cor || '#475569';
        
        html += `<tr class="${item.info.isMain ? 'fab-row-main' : ''}">
            <td>
                <div style="color:${color}">${item.info.label}</div>
                <div class="prod-badge">${item.info.produtos}</div>
            </td>
            <td style="width:140px">
                <div style="font-size:10px;margin-bottom:2px;font-family:var(--mono);color:var(--text2)">${p.toFixed(1)}%</div>
                <div class="fab-bar-wrap" style="height:4px;background:var(--border2)"><div class="fab-bar-fill" style="width:${width}%;background:${color}"></div></div>
            </td>
            <td style="font-family:var(--mono)">${fmt(item.val)}</td>
        </tr>`;
    });
    
    html += `<tr class="fab-total">
        <td colspan="2">TOTAL GERAL</td>
        <td style="font-family:var(--mono)">${fmt(totalAll)}</td>
    </tr></tbody></table>`;
    
    detailEl.innerHTML = html;
}

function renderFabTable(vkey, m, fabF) {
    const { D } = APP_DATA;
    const ftEl = document.getElementById('fabtable-' + vkey);
    if (!ftEl) return;

    const activeFabs = fabF === 'all' ? FABS : [fabF];
    const fabRows = activeFabs.map((f) => {
        const r = gv(D, vkey, f, m);
        const mt = gm(D, vkey, f, m);
        const p2 = pN(r, mt);
        const logoPath = FAB_LOGOS[f];
        
        return `
            <div class="fab-row">
                <img src="${logoPath}" style="width:44px;height:24px;object-fit:contain">
                <div style="flex:1;margin:0 10px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                        <span style="font-size:13px;font-family:var(--mono);font-weight:700;color:#0f172a">${fmt(r)}</span>
                        <span style="font-size:11px;color:#0f172a;font-weight:600">${mt > 0 ? 'meta: ' + fmt(mt) : 'sem meta'}</span>
                    </div>
                    <div class="fab-bar-wrap"><div class="fab-bar-fill" style="width:${mt > 0 ? Math.min(100, r / mt * 100) : 0}%;background:${FC[f]}"></div></div>
                </div>
                <span style="font-size:14px;font-weight:800;font-family:var(--mono);color:${scColor(p2)};width:60px;text-align:right">${p2 !== null ? p2.toFixed(1) + '%' : '—'}</span>
            </div>`;
    });

    ftEl.innerHTML = fabRows.join('');
}

// --- Event Handlers ---

let currentVendorInRange = null;

window.openRangeModal = function(vkey) {
    currentVendorInRange = vkey;
    const m = mesState[vkey] || 'all';
    if (typeof m === 'object') {
        document.getElementById('range-start').value = m.s;
        document.getElementById('range-end').value = m.e;
    }
    openModal('range');
};

document.getElementById('btn-apply-range')?.addEventListener('click', () => {
    const s = document.getElementById('range-start').value;
    const e = document.getElementById('range-end').value;
    
    if (currentVendorInRange) {
        mesState[currentVendorInRange] = { s, e };
        const labelEl = document.getElementById('filt-mes-label-' + currentVendorInRange);
        if (labelEl) labelEl.textContent = `${MONTH_LABELS[s].substring(0,3)} - ${MONTH_LABELS[e].substring(0,3)}`;
        
        closeModal('range');
        renderVendorPage(currentVendorInRange);
    }
});

function selectMes(vkey, m, el) {
    mesState[vkey] = m;
    const labelEl = document.getElementById('filt-mes-label-' + vkey);
    if (labelEl) labelEl.textContent = m === 'all' ? 'Acumulado' : (MONTH_LABELS[m] || m);
    
    const menu = document.getElementById('filt-mes-' + vkey);
    menu.querySelectorAll('.filt-opt').forEach(e => e.classList.remove('active'));
    if (el) el.classList.add('active');
    
    menu.style.display = 'none';
    const pill = menu.previousElementSibling;
    if (pill) pill.classList.remove('open');
    renderVendorPage(vkey);
}

function selectFab(vkey, fab, el) {
    fabFilterState[vkey] = fab;
    const labels = { all: 'Geral', pian: 'Pian', nutri: 'Nutri', erva: 'Pantanal', mek: 'Mek', outros: 'Outros' };
    const labelEl = document.getElementById('filt-fab-label-' + vkey);
    if (labelEl) labelEl.textContent = labels[fab] || 'Geral';

    const menu = document.getElementById('filt-fab-' + vkey);
    menu.querySelectorAll('.filt-opt').forEach(e => e.classList.remove('active'));
    if (el) el.classList.add('active');

    menu.style.display = 'none';
    const pill = menu.previousElementSibling;
    if (pill) pill.classList.remove('open');
    renderVendorPage(vkey);
}

function setResumoMes(m, el) {
    mesResumo = m;
    const parent = el ? el.parentElement : document.getElementById('mt-resumo');
    if (parent) {
        parent.querySelectorAll('.mchip, .tab-btn').forEach(b => b.classList.remove('active'));
    }
    if (el) el.classList.add('active');
    
    const charts = renderResumo(APP_DATA, mesResumo, resumoMode, resumoBarChart, resumoDonutChart, fabBarChart);
    resumoBarChart = charts.resumoBarChart;
    resumoDonutChart = charts.resumoDonutChart;
    fabBarChart = charts.fabBarChart;
}

function toggleResumoMode() {
    resumoMode = resumoMode === 'abs' ? 'pct' : 'abs';
    // Re-render summary charts
}



window.updateMapFilters = function() {
    const D = window.APP_DATA;
    if (!D) return;
    
    const m = document.getElementById('map-mes-sel')?.value || 'acum';
    const activeVnd = document.getElementById('map-vendor-sel')?.value || 'all';
    
    const geoKey = `GEO_${m.toUpperCase()}`;
    const geoData = D[geoKey] || [];
    
    const getVal = (city, vnd) => {
        if (vnd === 'all') return city.total;
        const v = city.vendors.find(x => x.key === vnd);
        return v ? v.value : 0;
    };

    renderMapMarkers(geoData, activeVnd, getVal, (ck) => {
        window.activeAbcCity = ck;
        goPage('abc');
    });
};

window.updateAbcFilters = function() {
    const mes = document.getElementById('abc-mes-sel')?.value || 'acum';
    const vendor = document.getElementById('abc-vendor-sel')?.value || 'all';
    setAbcFilter('mes', mes);
    setAbcFilter('vendor', vendor);
};

window.setAbcFilterToggle = function(letra, el) {
    toggleAbcCurva(letra, el);
};

// Start the app
init();
