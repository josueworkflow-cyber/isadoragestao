import { FABS, FLAB, FC, MONTHS, MONTH_LABELS } from './constants.js';
import { openModal, closeModal } from './ui.js';
import { fmt } from './utils.js';
import { gv } from './data-helpers.js';

let APP_DATA = null;

export function initEdit(appData) {
    APP_DATA = appData;
}

export function openEdit(vkey) {
  document.getElementById('edit-vendor-sel').value = vkey;
  renderEditTable();
  openModal('edit');
}

/** Helper to parse currency inputs formatted with pt-BR numbers */
function parseVal(s) {
  if (!s) return 0;
  const clean = s.toString().replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

/** Helper to calculate proportional monthly target for preview */
function calcPropMeta(D, vkey, factoryKey, idx, annualMeta) {
  if (!annualMeta || annualMeta <= 0) return 0;
  let prevSales = 0;
  for (let i = 0; i < idx; i++) {
    prevSales += gv(D, vkey, factoryKey, MONTHS[i]);
  }
  const remainingMonths = 12 - idx;
  const remainingGoal = annualMeta - prevSales;
  return remainingGoal > 0 ? remainingGoal / remainingMonths : 0;
}

/** Live update preview grids when annual meta inputs change */
function updateLivePreviews(vkey) {
  if (!APP_DATA || !APP_DATA.D) return;
  const { D } = APP_DATA;

  const updateFactoryGrid = (f, inputId) => {
    const el = document.getElementById(inputId);
    if (!el) return;
    const ma = parseVal(el.value);

    MONTHS.forEach((mk, idx) => {
      const metaEl = document.getElementById(`prev-meta-${vkey}-${f}-${mk}`);
      if (metaEl) {
        const val = calcPropMeta(D, vkey, f, idx, ma);
        metaEl.textContent = val > 0 ? fmt(val) : 'R$ 0,00';
      }
    });
  };

  updateFactoryGrid('total', `meta-${vkey}-total-ma`);
  FABS.forEach(f => updateFactoryGrid(f, `meta-${vkey}-${f}-ma`));
}

export function renderEditTable() {
  if (!APP_DATA) return;
  const { D } = APP_DATA;
  const vkey = document.getElementById('edit-vendor-sel').value;
  const wrap = document.getElementById('edit-table-wrap');

  let html = '';

  // 1. Info Banner about the new Proportional Target Flow
  html += `
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:12px 16px; margin-bottom:20px; font-size:12px; color:#1e40af; display:flex; align-items:flex-start; gap:10px">
      <span style="font-size:18px">💡</span>
      <div>
        <strong style="display:block; font-size:13px; margin-bottom:3px">Novo Fluxo de Metas Mensais Proporcionais</strong>
        Altere o <strong>Objetivo Anual (Meta Anual)</strong> do vendedor ou das fábricas. O sistema recalcula automaticamente a meta mensal de cada mês com base no faturamento acumulado já realizado e nos meses restantes do ano.
      </div>
    </div>
  `;

  // 2. Main Section: GERAL / TOTAL (FECHAMENTO)
  const totalMa = D[vkey]?.total?.ma || 0;
  html += `
    <div class="edit-fab-section" style="margin-bottom:20px; border:2px solid #2563eb; border-radius:12px; overflow:hidden; box-shadow: 0 4px 12px rgba(37,99,235,0.08); background:white">
      <div class="edit-fab-title" style="background:#2563eb; color:white; padding:12px 16px; font-weight:800; font-size:14px; display:flex; align-items:center; justify-content:space-between">
        <div style="display:flex; align-items:center; gap:8px">
          <span>🏆</span> META GERAL 2026 (FECHAMENTO DO VENDEDOR)
        </div>
        <span style="font-size:11px; opacity:0.9; font-weight:500">Base Principal do Vendedor</span>
      </div>
      
      <div style="padding:16px; background:#f8fafc">
        <div style="background:white; border:1px solid #cbd5e1; border-radius:10px; padding:14px; margin-bottom:16px">
          <label style="display:block; font-size:12px; font-weight:800; color:#1e293b; margin-bottom:6px">
            OBJETIVO ANUAL 2026 GERAL (R$)
          </label>
          <input type="text" class="edit-input live-ma-input" id="meta-${vkey}-total-ma" data-f="total"
                 value="${totalMa > 0 ? totalMa.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}"
                 placeholder="Ex: 1.200.000,00"
                 style="width:100%; font-weight:800; border:2px solid #2563eb; color:#1e40af; font-size:16px; padding:10px; border-radius:8px">
        </div>

        <div style="font-size:11px; font-weight:700; color:#475569; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px">
          📊 PRÉ-VISUALIZAÇÃO DAS METAS MENSAIS RECALCULADAS (GERAL)
        </div>
        
        <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:8px">
          ${MONTHS.map((mk, idx) => {
            const real = gv(D, vkey, 'total', mk);
            const propMeta = calcPropMeta(D, vkey, 'total', idx, totalMa);
            const remMonths = 12 - idx;
            return `
              <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:8px; text-align:center">
                <div style="font-size:10px; font-weight:800; color:#64748b; margin-bottom:2px">${MONTH_LABELS[mk].substring(0,3).toUpperCase()}</div>
                <div style="font-size:9px; color:#059669; font-weight:600" title="Faturamento Realizado">Real.: ${fmt(real)}</div>
                <div id="prev-meta-${vkey}-total-${mk}" style="font-size:11px; font-weight:800; color:#2563eb; margin-top:3px" title="Meta Mensal Recalculada">
                  ${propMeta > 0 ? fmt(propMeta) : 'R$ 0,00'}
                </div>
                <div style="font-size:8px; color:#94a3b8; margin-top:2px">(${remMonths}m rest.)</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // 3. Factory Sections (Pian, Nutri, Pantanal, Mek, Outros)
  FABS.forEach((f, i) => {
    const color = FC[f] || '#64748b';
    const fabMa = D[vkey]?.[f]?.ma || 0;

    html += `
      <div class="edit-fab-section" style="margin-bottom:16px; border:1px solid ${color}33; border-radius:12px; overflow:hidden; background:white">
        <div class="edit-fab-title" style="background:${color}11; color:${color}; padding:10px 16px; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:space-between">
          <div style="display:flex; align-items:center; gap:8px">
            <span>🎯</span> METAS FÁBRICA: ${FLAB[i].toUpperCase()}
          </div>
        </div>

        <div style="padding:14px">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px">
            <label style="font-size:11px; font-weight:800; color:${color}; white-space:nowrap">
              OBJETIVO ANUAL FÁBRICA (R$):
            </label>
            <input type="text" class="edit-input live-ma-input" id="meta-${vkey}-${f}-ma" data-f="${f}"
                   value="${fabMa > 0 ? fabMa.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}"
                   placeholder="Ex: 240.000,00"
                   style="flex:1; font-weight:700; color:${color}; border-color:${color}44; font-size:13px; padding:6px 10px; border-radius:6px">
          </div>

          <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px">
            ${MONTHS.map((mk, idx) => {
              const real = gv(D, vkey, f, mk);
              const propMeta = calcPropMeta(D, vkey, f, idx, fabMa);
              return `
                <div style="background:#f8fafc; border:1px solid #f1f5f9; border-radius:6px; padding:6px; text-align:center">
                  <div style="font-size:9px; font-weight:700; color:#94a3b8">${MONTH_LABELS[mk].substring(0,3).toUpperCase()}</div>
                  <div style="font-size:8px; color:#475569" title="Realizado">R: ${fmt(real)}</div>
                  <div id="prev-meta-${vkey}-${f}-${mk}" style="font-size:10px; font-weight:700; color:${color}; margin-top:2px" title="Meta Recalculada">
                    ${propMeta > 0 ? fmt(propMeta) : 'R$ 0,00'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  });

  // 4. Manual Pedidos Count Section
  const pedKeys = ['pj', 'pf', 'pm', 'pa', 'pmai', 'pjun', 'pjul', 'pago', 'pset', 'pout', 'pnov', 'pdez'];
  const vinfo = APP_DATA.VND_LIST.find(v => v.k === vkey);

  html += `
    <div class="edit-fab-section" style="margin-bottom:20px; border:1px solid #0891b244; border-radius:12px; overflow:hidden; background:white">
      <div class="edit-fab-title" style="background:#0891b211; color:#0891b2; padding:10px 16px; font-weight:800; font-size:13px; display:flex; align-items:center; gap:8px">
        <span>📦</span> NÚMERO DE PEDIDOS (AJUSTE MANUAL)
      </div>
      <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:8px; padding:14px">
        ${MONTHS.map((mk, idx) => `
          <div>
            <label style="display:block; font-size:9px; font-weight:700; color:#64748b; margin-bottom:3px; text-transform:uppercase">${MONTH_LABELS[mk].substring(0,3)}</label>
            <input type="number" class="edit-input" id="pedidos-${vkey}-${idx + 1}" 
                   value="${vinfo ? (vinfo[pedKeys[idx]] || 0) : 0}"
                   style="width:100%; font-weight:700; color:#0891b2; border-color:#bae6fd; font-size:13px; padding:6px; border-radius:6px">
          </div>
        `).join('')}
      </div>
      <div style="background:#f0f9ff; padding:8px 14px; font-size:11px; color:#0369a1; border-top:1px solid #bae6fd">
        ℹ️ Se deixado em 0 (zero), o número de pedidos é contabilizado pelas vendas importadas.
      </div>
    </div>
  `;

  if (wrap) {
    wrap.innerHTML = html;

    // Attach real-time input event listeners for live target preview updates
    wrap.querySelectorAll('.live-ma-input').forEach(input => {
      input.addEventListener('input', () => updateLivePreviews(vkey));
    });
  }
}

const API_URL = '/api';

export async function applyEditChanges() {
  if (!APP_DATA) return;
  const { D } = APP_DATA;
  const vkey = document.getElementById('edit-vendor-sel').value;

  const btn = document.querySelector('#modal-edit .modal-btn-primary');
  const oldTxt = btn ? btn.textContent : '';
  if (btn) {
    btn.textContent = '⏳ Salvando...';
    btn.disabled = true;
  }

  try {
    const factoriesToSave = [...FABS, 'total'];
    
    for (const f of factoriesToSave) {
      if (!D[vkey]) D[vkey] = {};
      if (!D[vkey][f]) D[vkey][f] = { metas: {}, mm:0, ma:0 };
      if (!D[vkey][f].metas) D[vkey][f].metas = {};

      const maInputId = `meta-${vkey}-${f}-ma`;
      const maEl = document.getElementById(maInputId);
      const maVal = maEl ? parseVal(maEl.value) : (D[vkey][f].ma || 0);

      D[vkey][f].ma = maVal;

      // Save overall annual meta + month-by-month recalculated metas into DB
      for (let m = 1; m <= 12; m++) {
        const mk = MONTHS[m - 1];
        const propMeta = calcPropMeta(D, vkey, f, m - 1, maVal);
        D[vkey][f].metas[mk] = propMeta;

        await fetch(`${API_URL}/data/metas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            vendorKey: vkey, 
            factoryKey: f, 
            month: m, 
            metaMensal: propMeta,
            metaAnual: maVal 
          })
        });
      }
    }

    // Save Manual Order Count
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
    alert('✅ Metas salvas e recalculadas com sucesso!');
  } catch (err) {
    console.error('Erro ao salvar metas:', err);
    alert('❌ Erro ao salvar metas. Verifique o console.');
  } finally {
    if (btn) {
      btn.textContent = oldTxt;
      btn.disabled = false;
    }
  }
}
