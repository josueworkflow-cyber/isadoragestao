import { FABS, FLAB, FC, MONTHS, MONTH_LABELS } from './constants.js';
import { openModal, closeModal } from './ui.js';
import { renderVendorPage } from './app.js';

let APP_DATA = null;

export function initEdit(appData) {
    APP_DATA = appData;
}

export function openEdit(vkey) {
  document.getElementById('edit-vendor-sel').value = vkey;
  renderEditTable();
  openModal('edit');
}

export function renderEditTable() {
  if (!APP_DATA) return;
  const { D } = APP_DATA;
  const vkey = document.getElementById('edit-vendor-sel').value;
  const wrap = document.getElementById('edit-table-wrap');

  let html2 = '';
  
  // Create a grid for all factories (Pian, Nutri, Erva, Mek, Outros)
  FABS.forEach((f, i) => {
    const color = FC[f] || '#64748b';
    html2 += `<div class="edit-fab-section" style="margin-bottom:20px; border:1px solid ${color}22; border-radius:12px; overflow:hidden">
      <div class="edit-fab-title" style="background:${color}11; color:${color}; padding:8px 15px; font-weight:800; font-size:13px; display:flex; align-items:center; gap:8px">
        <span>🎯</span> METAS: ${FLAB[i].toUpperCase()}
      </div>
      <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:8px;padding:12px;background:white">
        ${MONTHS.map((mk, idx) => `
          <div>
            <label style="display:block;font-size:9px;font-weight:700;color:#94a3b8;margin-bottom:3px;text-transform:uppercase">${MONTH_LABELS[mk].substring(0,3)}</label>
            <input type="text" class="edit-input" id="meta-${vkey}-${f}-${idx + 1}" 
                   value="${(D[vkey]?.[f]?.metas?.[mk] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"
                   style="width:100%;font-weight:600;color:${color};font-size:12px;padding:6px">
          </div>
        `).join('')}
      </div>
    </div>`;
  });

  // Unique Meta for GERAL / TOTAL
  html2 += `<div class="edit-fab-section" style="margin-bottom:20px; border:2px solid #2563eb44; border-radius:12px; overflow:hidden; box-shadow: 0 4px 12px rgba(37,99,235,0.1)">
    <div class="edit-fab-title" style="background:#2563eb; color:white; padding:10px 15px; font-weight:800; font-size:14px; display:flex; align-items:center; gap:8px">
      <span>🏆</span> META ÚNICA: FILTRO GERAL (FECHAMENTO)
    </div>
    <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:8px;padding:15px;background:#f0f7ff">
      ${MONTHS.map((mk, idx) => `
        <div>
          <label style="display:block;font-size:9px;font-weight:800;color:#1e40af;margin-bottom:3px;text-transform:uppercase">${MONTH_LABELS[mk]}</label>
          <input type="text" class="edit-input" id="meta-${vkey}-total-${idx + 1}" 
                 value="${(D[vkey]?.total?.metas?.[mk] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"
                 style="width:100%;font-weight:700;color:#1e40af;border-color:#bfdbfe;font-size:13px;padding:8px">
        </div>
      `).join('')}
      <div style="grid-column: span 3; background:#dbeafe; padding:10px; border-radius:8px; margin-top:5px; border:1px dashed #2563eb">
        <label style="display:block;font-size:11px;font-weight:800;color:#1e40af;margin-bottom:4px">OBJETIVO ANUAL 2026 (META ACUMULADA)</label>
        <input type="text" class="edit-input" id="meta-${vkey}-total-ma" 
               value="${(D[vkey]?.total?.ma || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"
               style="width:100%;font-weight:800;background:white;border-color:#2563eb;color:#1e40af;font-size:15px">
      </div>
    </div>
  </div>`;

  // NUMBER OF ORDERS section
  const pedKeys = ['pj', 'pf', 'pm', 'pa', 'pmai', 'pjun', 'pjul', 'pago', 'pset', 'pout', 'pnov', 'pdez'];
  const vinfo = APP_DATA.VND_LIST.find(v => v.k === vkey);

  html2 += `<div class="edit-fab-section" style="margin-bottom:20px; border:1px solid #0891b244; border-radius:12px; overflow:hidden">
    <div class="edit-fab-title" style="background:#0891b211; color:#0891b2; padding:10px 15px; font-weight:800; font-size:14px; display:flex; align-items:center; gap:8px">
      <span>📦</span> NÚMERO DE PEDIDOS (MANUAL)
    </div>
    <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:8px;padding:15px;background:white">
      ${MONTHS.map((mk, idx) => `
        <div>
          <label style="display:block;font-size:9px;font-weight:700;color:#64748b;margin-bottom:3px;text-transform:uppercase">${MONTH_LABELS[mk].substring(0,3)}</label>
          <input type="number" class="edit-input" id="pedidos-${vkey}-${idx + 1}" 
                 value="${vinfo ? (vinfo[pedKeys[idx]] || 0) : 0}"
                 style="width:100%;font-weight:700;color:#0891b2;border-color:#bae6fd;font-size:13px;padding:8px">
        </div>
      `).join('')}
    </div>
    <div style="background:#f0f9ff; padding:10px 15px; font-size:11px; color:#0369a1; border-top:1px solid #bae6fd">
      ℹ️ Se deixado em 0 (zero), o sistema continuará calculando automaticamente pelas vendas importadas.
    </div>
  </div>`;

  if (wrap) wrap.innerHTML = html2;
}

const API_URL = '/api';

export async function applyEditChanges() {
  if (!APP_DATA) return;
  const { D } = APP_DATA;
  const vkey = document.getElementById('edit-vendor-sel').value;
  const parseVal = s => {
    if (!s) return 0;
    const clean = s.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const btn = document.querySelector('#modal-edit .modal-btn-primary');
  const oldTxt = btn.textContent;
  btn.textContent = '⏳ Salvando...';
  btn.disabled = true;

  try {
    // 1. Save Metas (Factories + Total)
    const factoriesToSave = [...FABS, 'total'];
    for (const f of factoriesToSave) {
      if (!D[vkey]) D[vkey] = {};
      if (!D[vkey][f]) D[vkey][f] = { metas: {}, mm:0, ma:0 };
      if (!D[vkey][f].metas) D[vkey][f].metas = {};

      for (let m = 1; m <= 12; m++) {
        const inputId = `meta-${vkey}-${f}-${m}`;
        const el = document.getElementById(inputId);
        if (el) {
          const val = parseVal(el.value);
          const mk = MONTHS[m-1];
          D[vkey][f].metas[mk] = val;
          await fetch(`${API_URL}/data/metas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorKey: vkey, factoryKey: f, month: m, metaMensal: val })
          });
        }
      }

      if (f === 'total') {
        const maEl = document.getElementById(`meta-${vkey}-total-ma`);
        if (maEl) {
          const maVal = parseVal(maEl.value);
          D[vkey][f].ma = maVal;
          await fetch(`${API_URL}/data/metas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorKey: vkey, factoryKey: f, month: 1, metaMensal: D[vkey][f].metas['jan'] || 0, metaAnual: maVal })
          });
        }
      }
    }

    // 2. Save Pedidos Manual
    for (let m = 1; m <= 12; m++) {
      const pedEl = document.getElementById(`pedidos-${vkey}-${m}`);
      if (pedEl) {
        const pVal = parseInt(pedEl.value) || 0;
        await fetch(`${API_URL}/data/metas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            vendorKey: vkey, 
            factoryKey: 'orders', 
            month: m, 
            metaMensal: pVal 
          })
        });
      }
    }

    closeModal('edit');
    if (window.refreshAppData) await window.refreshAppData();
    alert('✅ Metas mensais salvas com sucesso!');
  } catch (err) {
    console.error('Erro ao salvar metas:', err);
    alert('❌ Erro ao salvar metas. Verifique o console.');
  } finally {
    btn.textContent = oldTxt;
    btn.disabled = false;
  }
}
