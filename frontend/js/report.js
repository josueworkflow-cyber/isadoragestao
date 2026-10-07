import { FABS, FLAB, FC, MONTHS, MONTH_LABELS, LOGO_MAIN } from './constants.js';
import { fmt } from './utils.js';
import { openModal, closeModal } from './ui.js';
import { gv, gm, getMonthRange } from './data-helpers.js';

let APP_DATA = null;
export let rptVendors = new Set();
let cachedLogoBase64 = null;

/**
 * Initialize report module with application data
 */
export function initReport(appData) {
  APP_DATA = appData;
  preloadLogo();
  renderVendorSelectionList();
}

/**
 * Preload company logo as Base64 to ensure instant rendering in PDF without CORS or delay
 */
async function preloadLogo() {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const res = await fetch(LOGO_MAIN || 'assets/img/logo_main.png');
    if (!res.ok) throw new Error('Falha ao carregar logo');
    const blob = await res.blob();
    cachedLogoBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(LOGO_MAIN || 'assets/img/logo_main.png');
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    cachedLogoBase64 = LOGO_MAIN || 'assets/img/logo_main.png';
  }
  return cachedLogoBase64;
}

/**
 * Dynamically render vendor checkable buttons
 */
export function renderVendorSelectionList() {
  const container = document.getElementById('report-vendor-list');
  if (!container || !APP_DATA || !APP_DATA.VND_LIST) return;

  const vendors = APP_DATA.VND_LIST;
  container.innerHTML = vendors.map(v => `
    <label class="rpt-vendor-check-card ${rptVendors.has(v.k) ? 'active' : ''}" data-v="${v.k}">
      <input type="checkbox" class="rpt-vendor-check" value="${v.k}" ${rptVendors.has(v.k) ? 'checked' : ''} onchange="toggleReportVendor('${v.k}')">
      <span class="rpt-vendor-dot" style="background:${v.c}"></span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.l}</span>
    </label>
  `).join('');

  updateVendorUI();
}

/**
 * Open report modal pre-configured for 'all' or a specific vendor
 */
export function openReport(vkey = 'all') {
  if (!APP_DATA || !APP_DATA.VND_LIST) return;
  const vendors = APP_DATA.VND_LIST;

  if (vkey === 'all') {
    rptVendors = new Set(vendors.map(v => v.k));
  } else {
    rptVendors = new Set([vkey]);
  }

  // Set default period dropdown state
  const periodTypeEl = document.getElementById('rpt-period-type');
  if (periodTypeEl) {
    periodTypeEl.value = 'single';
    onPeriodTypeChange();
  }

  const singleMonthEl = document.getElementById('rpt-single-month');
  if (singleMonthEl) {
    singleMonthEl.value = 'abr'; // Default to current month (Abril)
  }

  updateVendorUI();
  openModal('report');
}

/**
 * Toggle an individual vendor's selection
 */
export function toggleReportVendor(vkey) {
  if (rptVendors.has(vkey)) {
    rptVendors.delete(vkey);
  } else {
    rptVendors.add(vkey);
  }
  updateVendorUI();
}

/**
 * Toggle all vendors on or off
 */
export function toggleAllReportVendors(forcedState) {
  if (!APP_DATA || !APP_DATA.VND_LIST) return;
  const allVendors = APP_DATA.VND_LIST.map(v => v.k);

  let selectAll;
  if (typeof forcedState === 'boolean') {
    selectAll = forcedState;
  } else {
    selectAll = rptVendors.size !== allVendors.length;
  }

  if (selectAll) {
    rptVendors = new Set(allVendors);
  } else {
    rptVendors.clear();
  }

  updateVendorUI();
}

/**
 * Update UI elements representing the vendor selection state
 */
export function updateVendorUI() {
  if (!APP_DATA || !APP_DATA.VND_LIST) return;
  const total = APP_DATA.VND_LIST.length;
  const count = rptVendors.size;
  const isAll = count === total && total > 0;

  // Master 'Todos' checkbox and card
  const chkAll = document.getElementById('rpt-chk-all');
  if (chkAll) chkAll.checked = isAll;

  const btnAll = document.getElementById('rpt-vendor-all-btn');
  if (btnAll) btnAll.classList.toggle('active', isAll);

  // Counter text
  const countEl = document.getElementById('rpt-vendor-count');
  if (countEl) {
    countEl.textContent = `${count} de ${total} selecionado${count !== 1 ? 's' : ''}`;
  }

  // Individual vendor cards
  document.querySelectorAll('#report-vendor-list .rpt-vendor-check-card').forEach(card => {
    const vk = card.dataset.v;
    const isChecked = rptVendors.has(vk);
    card.classList.toggle('active', isChecked);
    const input = card.querySelector('input[type="checkbox"]');
    if (input) input.checked = isChecked;
  });
}

/**
 * Handle period type dropdown change (single, range, all)
 */
export function onPeriodTypeChange() {
  const typeEl = document.getElementById('rpt-period-type');
  if (!typeEl) return;
  const type = typeEl.value;

  const singleContainer = document.getElementById('rpt-single-container');
  const rangeContainer = document.getElementById('rpt-range-container');
  const allContainer = document.getElementById('rpt-all-container');

  if (singleContainer) singleContainer.style.display = (type === 'single') ? 'block' : 'none';
  if (rangeContainer) rangeContainer.style.display = (type === 'range') ? 'block' : 'none';
  if (allContainer) allContainer.style.display = (type === 'all') ? 'block' : 'none';
}

/**
 * Read and validate selected period from dropdowns
 */
export function getSelectedPeriod() {
  const typeEl = document.getElementById('rpt-period-type');
  const type = typeEl ? typeEl.value : 'single';

  if (type === 'all') {
    return {
      type: 'all',
      mParam: 'all',
      label: 'Acumulado 2026',
      subLabel: 'Janeiro a Dezembro de 2026',
      months: [...MONTHS],
      monthNums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      slug: 'acumulado'
    };
  }

  if (type === 'range') {
    const startEl = document.getElementById('rpt-range-start');
    const endEl = document.getElementById('rpt-range-end');
    const s = startEl ? startEl.value : 'jan';
    const e = endEl ? endEl.value : 'abr';

    let range = getMonthRange(s, e);
    if (!range || range.length === 0) range = [s];

    const monthNums = range.map(mk => MONTHS.indexOf(mk) + 1);
    const startLabel = MONTH_LABELS[range[0]];
    const endLabel = MONTH_LABELS[range[range.length - 1]];
    const label = `${startLabel} a ${endLabel} 2026`;

    return {
      type: 'range',
      mParam: { s: range[0], e: range[range.length - 1] },
      label,
      subLabel: `Período: ${startLabel} a ${endLabel}`,
      months: range,
      monthNums,
      slug: `${range[0]}-${range[range.length - 1]}`
    };
  }

  // Single month (default)
  const singleEl = document.getElementById('rpt-single-month');
  const m = singleEl ? singleEl.value : 'abr';
  const monthNum = MONTHS.indexOf(m) + 1;
  const label = `${MONTH_LABELS[m]} 2026`;

  return {
    type: 'single',
    mParam: m,
    label,
    subLabel: `Mês de Referência: ${MONTH_LABELS[m]}`,
    months: [m],
    monthNums: [monthNum],
    slug: m
  };
}

/**
 * Generate and download Corporate Mobile-Optimized Vertical PDF Report
 */
export async function generatePdfReport() {
  if (!APP_DATA) return;
  const { VND_LIST, D } = APP_DATA;

  if (rptVendors.size === 0) {
    alert('Por favor, selecione pelo menos um vendedor.');
    return;
  }

  const vendors = VND_LIST.filter(v => rptVendors.has(v.k));
  const period = getSelectedPeriod();

  const showKpisEl = document.getElementById('rpt-kpis');
  const showKpis = showKpisEl ? showKpisEl.checked : true;

  const showFabEl = document.getElementById('rpt-fabrica');
  const showFab = showFabEl ? showFabEl.checked : true;

  const showAbcEl = document.getElementById('rpt-abc');
  const showAbc = showAbcEl ? showAbcEl.checked : true;

  const showRankEl = document.getElementById('rpt-ranking');
  const showRank = showRankEl ? showRankEl.checked : true;

  const btn = document.getElementById('btn-rpt-pdf');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = 'Gerando PDF...';
    btn.disabled = true;
  }

  try {
    const logoDataUrl = await preloadLogo();
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Create visible rendering overlay so html2canvas renders the layout with 100% fidelity
    const overlay = document.createElement('div');
    overlay.id = 'pdf-gen-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.85);
      z-index: 999999;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 10px;
      box-sizing: border-box;
    `;

    const statusBadge = document.createElement('div');
    statusBadge.style.cssText = `
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 16px;
      padding: 8px 20px;
      background: #1e3a5f;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      letter-spacing: 0.3px;
    `;
    statusBadge.textContent = 'Gerando documento PDF, aguarde...';
    overlay.appendChild(statusBadge);

    const container = document.createElement('div');
    container.id = 'pdf-report-canvas-container';
    container.style.cssText = `
      width: 720px;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 28px 32px;
      box-sizing: border-box;
      border-radius: 6px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      line-height: 1.4;
    `;

    let html = `
      <!-- CABECALHO INSTITUCIONAL CENTRALIZADO COM LOGO (SEM EMOJI) -->
      <div style="text-align:center;margin-bottom:18px;border-bottom:2px solid #1e3a5f;padding-bottom:16px">
        <div style="display:flex;justify-content:center;align-items:center;margin-bottom:10px">
          <img src="${logoDataUrl}" style="height:55px;max-width:220px;object-fit:contain;display:block" alt="Logo">
        </div>
        <h1 style="margin:4px 0 2px 0;font-size:18px;font-weight:800;color:#1e3a5f;letter-spacing:1px;text-transform:uppercase">RELATÓRIO COMERCIAL 2026</h1>
        <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px">${period.label}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px">EMITIDO EM ${currentDate.toUpperCase()} · IZAIR BORBA & CIA LTDA</div>
      </div>
    `;

    // 1. SEÇÃO RANKING GERAL DA EQUIPE (SE SELECIONADO MAIS DE 1 VENDEDOR E OPÇÃO ATIVA)
    if (showRank && vendors.length > 1) {
      const sorted = [...vendors].sort((a, b) => gv(D, b.k, 'total', period.mParam) - gv(D, a.k, 'total', period.mParam));
      html += `
        <div style="margin-bottom:22px;page-break-inside:avoid">
          <div style="font-size:12px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid #e2e8f0">
            RANKING DA EQUIPE DE VENDAS
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead>
              <tr style="background:#1e3a5f;color:#ffffff">
                <th style="padding:7px 10px;text-align:center;width:45px">POS</th>
                <th style="padding:7px 10px;text-align:left">VENDEDOR</th>
                <th style="padding:7px 10px;text-align:right">FATURAMENTO</th>
                <th style="padding:7px 10px;text-align:right">META</th>
                <th style="padding:7px 10px;text-align:center;width:65px">% META</th>
              </tr>
            </thead>
            <tbody>
      `;

      sorted.forEach((v, idx) => {
        const r = gv(D, v.k, 'total', period.mParam);
        const mt = gm(D, v.k, 'total', period.mParam);
        const p = mt > 0 ? (r / mt * 100).toFixed(1) + '%' : '—';
        const isSuccess = parseFloat(p) >= 100;
        const rowBg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';

        html += `
          <tr style="background:${rowBg};border-bottom:1px solid #e2e8f0">
            <td style="padding:7px 10px;text-align:center;font-weight:800;color:#1e3a5f">${idx + 1}º</td>
            <td style="padding:7px 10px;font-weight:700;color:${v.c}">${v.l}</td>
            <td style="padding:7px 10px;text-align:right;font-family:monospace;font-weight:700">${fmt(r)}</td>
            <td style="padding:7px 10px;text-align:right;font-family:monospace;color:#64748b">${mt > 0 ? fmt(mt) : '—'}</td>
            <td style="padding:7px 10px;text-align:center;font-family:monospace;font-weight:800;color:${isSuccess ? '#059669' : '#dc2626'}">${p}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
    }

    // 2. DETALHAMENTO INDIVIDUAL POR VENDEDOR
    vendors.forEach((v) => {
      const real = gv(D, v.k, 'total', period.mParam);
      const meta = gm(D, v.k, 'total', period.mParam);
      const pct = meta > 0 ? (real / meta * 100).toFixed(1) + '%' : '—';
      const gap = meta > 0 ? Math.max(0, meta - real) : 0;
      const isSuccess = meta > 0 && real >= meta;

      html += `
        <div style="margin-bottom:24px;page-break-inside:avoid">
          <!-- CABEÇALHO DO VENDEDOR -->
          <div style="display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-left:5px solid ${v.c};border-radius:0 6px 6px 0;padding:8px 12px;margin-bottom:12px;border-bottom:1px solid #e2e8f0">
            <div>
              <div style="font-size:14px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.4px">${v.l}</div>
              <div style="font-size:10px;font-weight:600;color:#64748b">${period.subLabel.toUpperCase()}</div>
            </div>
            <div style="font-size:11px;font-weight:800;font-family:monospace;color:${isSuccess ? '#059669' : '#dc2626'}">
              ${pct !== '—' ? pct + ' DA META' : 'SEM META'}
            </div>
          </div>
      `;

      // KPIS DO VENDEDOR
      if (showKpis) {
        html += `
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid ${v.c};border-radius:6px;padding:8px 10px">
              <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase">FATURAMENTO</div>
              <div style="font-size:14px;font-weight:800;font-family:monospace;color:${v.c};margin-top:2px">${fmt(real)}</div>
            </div>
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #7c3aed;border-radius:6px;padding:8px 10px">
              <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase">META</div>
              <div style="font-size:14px;font-weight:800;font-family:monospace;color:#7c3aed;margin-top:2px">${meta > 0 ? fmt(meta) : '—'}</div>
            </div>
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid ${isSuccess ? '#059669' : '#dc2626'};border-radius:6px;padding:8px 10px">
              <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase">% META</div>
              <div style="font-size:14px;font-weight:800;font-family:monospace;color:${isSuccess ? '#059669' : '#dc2626'};margin-top:2px">${pct}</div>
            </div>
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #e11d48;border-radius:6px;padding:8px 10px">
              <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase">GAP RESTANTE</div>
              <div style="font-size:13px;font-weight:800;font-family:monospace;color:#e11d48;margin-top:2px">${gap > 0 ? fmt(gap) : 'Meta Atingida'}</div>
            </div>
          </div>
        `;
      }

      // RESULTADOS POR FABRICA
      if (showFab) {
        html += `
          <div style="margin-bottom:12px">
            <div style="font-size:11px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px">
              RESULTADOS POR FÁBRICA
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              <thead>
                <tr style="background:#f1f5f9;color:#475569">
                  <th style="padding:6px 10px;text-align:left;font-size:9px;text-transform:uppercase">FÁBRICA</th>
                  <th style="padding:6px 10px;text-align:right;font-size:9px;text-transform:uppercase">REALIZADO</th>
                  <th style="padding:6px 10px;text-align:right;font-size:9px;text-transform:uppercase">META</th>
                  <th style="padding:6px 10px;text-align:right;font-size:9px;text-transform:uppercase;width:75px">% ATINGIDO</th>
                </tr>
              </thead>
              <tbody>
        `;

        FABS.forEach((f, i) => {
          const r2 = gv(D, v.k, f, period.mParam);
          const mt2 = gm(D, v.k, f, period.mParam);
          const p2 = mt2 > 0 ? (r2 / mt2 * 100).toFixed(1) + '%' : '—';
          const isFabOk = mt2 > 0 && r2 >= mt2;

          html += `
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:6px 10px;font-weight:700;color:${FC[f] || '#0f172a'}">${FLAB[i]}</td>
              <td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700">${fmt(r2)}</td>
              <td style="padding:6px 10px;text-align:right;font-family:monospace;color:#64748b">${mt2 > 0 ? fmt(mt2) : 'Sem meta'}</td>
              <td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:800;color:${isFabOk ? '#059669' : '#dc2626'}">${p2}</td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;
      }

      // CLIENTES ABC (TOP 20)
      if (showAbc) {
        let clients = [];
        if (period.type === 'all') {
          const map = {};
          MONTHS.forEach(mk => {
            const src = APP_DATA[`ABC_${mk.toUpperCase()}`];
            if (src) {
              const list = src[v.k] || src[v.l] || [];
              list.forEach(c => {
                const key = `${c.n}__${c.ck || c.cd || ''}`;
                if (!map[key]) map[key] = { n: c.n, cd: c.cd, ck: c.ck, v: 0 };
                map[key].v += (c.v || 0);
              });
            }
          });
          clients = Object.values(map).sort((a, b) => b.v - a.v);
        } else if (period.type === 'range') {
          const map = {};
          period.months.forEach(mk => {
            const src = APP_DATA[`ABC_${mk.toUpperCase()}`];
            if (src) {
              const list = src[v.k] || src[v.l] || [];
              list.forEach(c => {
                const key = `${c.n}__${c.ck || c.cd || ''}`;
                if (!map[key]) map[key] = { n: c.n, cd: c.cd, ck: c.ck, v: 0 };
                map[key].v += (c.v || 0);
              });
            }
          });
          clients = Object.values(map).sort((a, b) => b.v - a.v);
        } else {
          const src = APP_DATA[`ABC_${period.slug.toUpperCase()}`];
          const raw = src ? (src[v.k] || src[v.l] || []) : [];
          clients = [...raw].sort((a, b) => b.v - a.v);
        }

        // Recalculate curve tags
        clients.forEach(c => {
          if (!c.a) {
            if (c.v > 2000) c.a = 'A';
            else if (c.v > 500) c.a = 'B';
            else c.a = 'C';
          }
        });

        if (clients.length > 0) {
          html += `
            <div style="margin-bottom:12px">
              <div style="font-size:11px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px">
                TOP 20 CLIENTES (CURVA ABC)
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:10px">
                <thead>
                  <tr style="background:#f1f5f9;color:#475569">
                    <th style="padding:5px 8px;text-align:center;width:30px">#</th>
                    <th style="padding:5px 8px;text-align:left">CLIENTE</th>
                    <th style="padding:5px 8px;text-align:left">CIDADE</th>
                    <th style="padding:5px 8px;text-align:right">FATURAMENTO</th>
                    <th style="padding:5px 8px;text-align:center;width:45px">CURVA</th>
                  </tr>
                </thead>
                <tbody>
          `;

          clients.slice(0, 20).forEach((c, idx) => {
            let badgeBg = '#f1f5f9';
            let badgeColor = '#475569';
            if (c.a === 'A') { badgeBg = '#C6EFCE'; badgeColor = '#276221'; }
            else if (c.a === 'B') { badgeBg = '#FFEB9C'; badgeColor = '#9C5700'; }
            else if (c.a === 'C') { badgeBg = '#FFC7CE'; badgeColor = '#9C0006'; }

            html += `
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:5px 8px;text-align:center;font-weight:700;color:#94a3b8">${idx + 1}</td>
                <td style="padding:5px 8px;font-weight:600;color:#0f172a">${c.n}</td>
                <td style="padding:5px 8px;color:#64748b">${c.cd || '—'}</td>
                <td style="padding:5px 8px;text-align:right;font-family:monospace;font-weight:700">${fmt(c.v)}</td>
                <td style="padding:5px 8px;text-align:center">
                  <span style="display:inline-block;padding:2px 6px;border-radius:4px;font-weight:800;font-size:9px;background:${badgeBg};color:${badgeColor}">
                    ${c.a}
                  </span>
                </td>
              </tr>
            `;
          });

          html += `
                </tbody>
              </table>
            </div>
          `;
        }
      }

      html += `</div>`; // Close vendor section
    });

    // RODAPÉ INSTITUCIONAL (SEM EMOJI)
    html += `
      <div style="text-align:center;color:#94a3b8;font-size:9px;margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0">
        Relatório Gerencial Comercial · Izair Borba & Cia Ltda · Documento Oficial Gerado pelo Sistema
      </div>
    `;

    container.innerHTML = html;
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Wait 350ms to ensure complete DOM layout, fonts, and image rasterization
    await new Promise(resolve => setTimeout(resolve, 350));

    // Setup html2pdf configuration for Mobile Portrait
    const opt = {
      margin: [8, 8, 8, 8],
      filename: `relatorio-comercial-${period.slug}-2026.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
        scrollX: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    if (window.html2pdf) {
      await window.html2pdf().set(opt).from(container).save();
    } else {
      window.print();
    }
  } catch (err) {
    console.error('Erro ao gerar relatório PDF:', err);
    alert('Erro ao gerar o relatório em PDF. Por favor, tente novamente.');
  } finally {
    const ov = document.getElementById('pdf-gen-overlay');
    if (ov) ov.remove();
    closeModal('report');
    if (btn) {
      btn.innerHTML = originalText || '📄 Baixar PDF';
      btn.disabled = false;
    }
  }
}

/**
 * Helper to convert 1-based column number to Excel letter (A, B, C... AA, AB...)
 */
function getColLetter(colIdx) {
  let temp, letter = '';
  let n = colIdx;
  while (n > 0) {
    temp = (n - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    n = Math.floor((n - temp - 1) / 26);
  }
  return letter;
}

/**
 * Generate and download Corporate Excel Report using unified period selection
 * All data in a SINGLE worksheet with native Excel AutoFilter enabled
 */
export async function generateExcelReport() {
  if (!APP_DATA) return;
  const { VND_LIST } = APP_DATA;

  if (rptVendors.size === 0) {
    alert('Por favor, selecione pelo menos um vendedor.');
    return;
  }

  const vendors = VND_LIST.filter(v => rptVendors.has(v.k));
  const period = getSelectedPeriod();
  const monthNums = period.monthNums;

  const btn = document.getElementById('btn-rpt-excel');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = 'Gerando Excel...';
    btn.disabled = true;
  }

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Dashboard Comercial 2026';
    wb.created = new Date();

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    const totalFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    const dataFont = { size: 10, name: 'Calibri' };
    const boldDataFont = { bold: true, size: 10, name: 'Calibri' };
    const currencyFormat = 'R$ #,##0.00';
    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    };

    // Fetch data for all selected vendors and months in parallel
    const fetchPromises = [];
    vendors.forEach(v => {
      monthNums.forEach(mNum => {
        fetchPromises.push(
          fetch(`/api/data/weekly-report?vendor=${v.k}&month=${mNum}`)
            .then(r => r.json())
            .then(data => ({ vendor: v, monthNum: mNum, data }))
            .catch(() => null)
        );
      });
    });
    const results = await Promise.all(fetchPromises);

    // Filter to valid results containing supplier sales
    const validResults = results.filter(r => r && r.data && r.data.suppliers && r.data.suppliers.length > 0);

    if (validResults.length === 0) {
      alert('Nenhum dado encontrado para os vendedores e período selecionados.');
      return;
    }

    // Determine maximum weeks across the selected months
    let maxWeeks = 4;
    validResults.forEach(r => {
      if (r.data.weeks && r.data.weeks.length > maxWeeks) {
        maxWeeks = r.data.weeks.length;
      }
    });

    const isSingleMonth = monthNums.length === 1;
    const wsName = 'Vendas por Fornecedor';
    const ws = wb.addWorksheet(wsName);

    // Build header column labels
    let weekHeaders = [];
    if (isSingleMonth) {
      const sampleWeeks = validResults.find(r => r.data.weeks && r.data.weeks.length >= maxWeeks)?.data?.weeks || [];
      for (let i = 0; i < maxWeeks; i++) {
        const w = sampleWeeks[i];
        weekHeaders.push(w ? `${w.label} (${w.range})` : `SEMANA ${i + 1}`);
      }
    } else {
      for (let i = 1; i <= maxWeeks; i++) {
        weekHeaders.push(`SEMANA ${i}`);
      }
    }

    const headers = ['VENDEDOR', 'MÊS', 'FORNECEDOR', 'PRODUTO', ...weekHeaders, 'AJUSTE MENSAL', 'TOTAL'];
    const totalCols = headers.length;

    // Row 1: Headers with corporate styling
    const headerRow = ws.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: colNumber <= 4 ? 'left' : 'right', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // Compile rows from all vendors into a single dataset
    const dataRows = [];
    validResults.forEach(item => {
      const { vendor, monthNum, data } = item;
      const monthLabel = data.monthName || MONTH_LABELS[MONTHS[monthNum - 1]] || `Mês ${monthNum}`;

      data.suppliers.forEach(supplier => {
        const displayName = supplier.name;
        const productDesc = supplier.product || '';
        const row = [
          vendor.l,
          monthLabel,
          displayName,
          productDesc
        ];

        for (let i = 0; i < maxWeeks; i++) {
          row.push(supplier.weekValues[i] || 0);
        }
        row.push(supplier.adjustmentValue || 0, supplier.total || 0);

        dataRows.push({
          vendorKey: vendor.k,
          vendorName: vendor.l,
          monthNum,
          supplierName: displayName,
          rowData: row
        });
      });
    });

    // Sort rows: by Vendor, then by Month, then by Supplier
    dataRows.sort((a, b) => {
      if (a.vendorName !== b.vendorName) return a.vendorName.localeCompare(b.vendorName);
      if (a.monthNum !== b.monthNum) return a.monthNum - b.monthNum;
      return a.supplierName.localeCompare(b.supplierName);
    });

    // Add data rows to worksheet
    dataRows.forEach((r, idx) => {
      const row = ws.addRow(r.rowData);
      row.height = 19;
      row.eachCell((cell, colNumber) => {
        cell.border = thinBorder;
        if (colNumber <= 2) {
          cell.font = boldDataFont;
          cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'center', vertical: 'middle' };
        } else if (colNumber === 3) {
          cell.font = boldDataFont;
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (colNumber === 4) {
          cell.font = dataFont;
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          cell.numFmt = currencyFormat;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (colNumber === totalCols) {
            cell.font = boldDataFont;
          }
        }
      });

      // Alternating row colors (zebra striping)
      if (idx % 2 === 0) {
        row.eachCell(cell => {
          if (!cell.fill || cell.fill.type !== 'pattern') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });
      }
    });

    const lastDataRow = 1 + dataRows.length;

    // Enable Excel native AutoFilter covering all columns (including VENDEDOR)
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: lastDataRow, column: totalCols }
    };

    // Blank spacer row before totals
    ws.addRow([]);

    // Grand Total Row with dynamic SUBTOTAL formulas that recalculate when filtered in Excel
    const grandRow = ['► TOTAL GERAL', '', '', ''];
    for (let c = 5; c <= totalCols; c++) {
      const colLtr = getColLetter(c);
      const initialSum = dataRows.reduce((sum, r) => sum + (r.rowData[c - 1] || 0), 0);
      grandRow.push({
        formula: `SUBTOTAL(9, ${colLtr}2:${colLtr}${lastDataRow})`,
        result: initialSum
      });
    }

    const totalRowExcel = ws.addRow(grandRow);
    totalRowExcel.height = 24;
    totalRowExcel.eachCell((cell, colNumber) => {
      cell.fill = totalFill;
      cell.font = totalFont;
      cell.border = thinBorder;
      if (colNumber <= 4) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.numFmt = currencyFormat;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });

    // Column widths
    ws.getColumn(1).width = 18; // VENDEDOR
    ws.getColumn(2).width = 14; // MÊS
    ws.getColumn(3).width = 40; // FORNECEDOR
    ws.getColumn(4).width = 28; // PRODUTO
    for (let c = 5; c <= totalCols; c++) {
      ws.getColumn(c).width = isSingleMonth ? 22 : 18; // SEMANAS + TOTAL
    }

    // Freeze header row and identification columns (A, B, C)
    ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 3 }];

    // Generate and download the file
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-semanal-${period.slug}-2026.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);

    closeModal('report');
  } catch (err) {
    console.error('Erro ao gerar Excel:', err);
    alert('Erro ao gerar relatório Excel. Verifique se há dados importados para o período selecionado.');
  } finally {
    if (btn) {
      btn.innerHTML = originalText || '📊 Baixar Excel';
      btn.disabled = false;
    }
  }
}
