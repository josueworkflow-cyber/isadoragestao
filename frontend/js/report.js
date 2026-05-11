import { FABS, FLAB, FC, MONTHS, MONTH_LABELS } from './constants.js';
import { fmt } from './utils.js';
import { openModal, closeModal } from './ui.js';
import { gv, gm } from './data-helpers.js';

let APP_DATA = null;
export let rptVendors = new Set(['all']);
export let rptMes = 'all';

export function initReport(appData) {
    APP_DATA = appData;
}

export function openReport(vkey) {
  rptVendors = new Set([vkey]);
  document.querySelectorAll('#report-vendor-chips .abc-chip').forEach(e => {
    e.classList.toggle('active', e.dataset.v === vkey || (vkey === 'all' && e.dataset.v === 'all'));
  });
  rptMes = 'all';
  document.querySelectorAll('#rpt-mes-options .abc-chip').forEach(e => e.classList.remove('active'));
  document.getElementById('rpt-mes-all')?.classList.add('active');
  openModal('report');
}

export function toggleReportVendor(v, el) {
  if (v === 'all') {
    rptVendors = new Set(['all']);
    document.querySelectorAll('#report-vendor-chips .abc-chip').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
  } else {
    rptVendors.delete('all');
    document.querySelector('#report-vendor-chips [data-v="all"]').classList.remove('active');
    if (rptVendors.has(v)) { rptVendors.delete(v); el.classList.remove('active'); }
    else { rptVendors.add(v); el.classList.add('active'); }
    if (rptVendors.size === 0) { rptVendors.add('all'); document.querySelector('#report-vendor-chips [data-v="all"]').classList.add('active'); }
  }
}

export function setRptMes(m, el) {
  rptMes = m;
  document.querySelectorAll('#rpt-mes-options .abc-chip').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
}

export function generateReport() {
  if (!APP_DATA) return;
  const { VND_LIST, D } = APP_DATA;
  const vendors = rptVendors.has('all') ? VND_LIST : VND_LIST.filter(v => rptVendors.has(v.k));
  const m = rptMes;
  const mesLabel = m === 'all' ? 'Acumulado' : MONTH_LABELS[m];
  
  const showKpisEl = document.getElementById('rpt-kpis');
  const showKpis = showKpisEl ? showKpisEl.checked : true;
  
  const showFabEl = document.getElementById('rpt-fabrica');
  const showFab = showFabEl ? showFabEl.checked : true;
  
  const showAbcEl = document.getElementById('rpt-abc');
  const showAbc = showAbcEl ? showAbcEl.checked : true;
  
  const showRankEl = document.getElementById('rpt-ranking');
  const showRank = showRankEl ? showRankEl.checked : true;

  let html = `<!DOCTPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório Comercial 2026</title>
<style>
body{font-family:'Segoe UI',sans-serif;background:#f0f2f5;color:#0f172a;margin:0;padding:24px;font-size:13px}
.rpt-header{background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;border-radius:14px;padding:28px 32px;margin-bottom:24px}
.rpt-header h1{margin:0 0 4px;font-size:22px;font-weight:800}
.rpt-header p{margin:0;opacity:.8;font-size:12px}
.rpt-section{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.07);padding:20px 24px;margin-bottom:16px;page-break-inside:avoid}
.rpt-section h2{font-size:14px;font-weight:800;margin:0 0 14px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px}
.rpt-section h3{font-size:13px;font-weight:700;margin:14px 0 8px;color:#2563eb}
.kpi-row{display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap}
.kpi-box{flex:1;min-width:130px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px}
.kpi-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
.kpi-val{font-size:16px;font-weight:800;font-family:monospace}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#1e3a5f;color:#fff;padding:8px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
td{padding:8px 12px;border-bottom:1px solid #e2e8f0}
tr:nth-child(even){background:#f8fafc}
.badge{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;font-size:10px;font-weight:800}
.badge.A{background:#C6EFCE;color:#276221}
.badge.B{background:#FFEB9C;color:#9C5700}
.badge.C{background:#FFC7CE;color:#9C0006}
.fab-row-rpt{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #e2e8f0}
.fab-row-rpt:last-child{border-bottom:none}
@media print{body{background:#fff;padding:0}.rpt-section{box-shadow:none}}
</style></head><body>
<div class="rpt-header">
  <h1>⚡ Relatório Comercial 2026</h1>
  <p>${mesLabel} · Gerado em ${new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</p>
</div>`;

  vendors.forEach(v => {
    const real = gv(D, v.k, 'total', m);
    const meta = gm(D, v.k, 'total', m);
    const pct = meta > 0 ? (real / meta * 100).toFixed(1) + '%' : '—';
    const gap = meta > 0 ? Math.max(0, meta - real) : 0;
    const color = v.c;

    html += `<div class="rpt-section">
      <h2 style="border-bottom-color:${color}">${v.l} <span style="font-size:11px;font-weight:500;color:#64748b">· ${mesLabel}</span></h2>`;

    if (showKpis) {
      html += `<div class="kpi-row">
        <div class="kpi-box" style="border-top:3px solid ${color}"><div class="kpi-lbl">Faturamento</div><div class="kpi-val" style="color:${color}">${fmt(real)}</div></div>
        <div class="kpi-box" style="border-top:3px solid #7c3aed"><div class="kpi-lbl">Meta</div><div class="kpi-val" style="color:#7c3aed">${meta > 0 ? fmt(meta) : '—'}</div></div>
        <div class="kpi-box" style="border-top:3px solid ${real >= meta ? '#059669' : '#dc2626'}"><div class="kpi-lbl">% Meta</div><div class="kpi-val" style="color:${real >= meta ? '#059669' : '#dc2626'}">${pct}</div></div>
        <div class="kpi-box" style="border-top:3px solid #e11d48"><div class="kpi-lbl">Gap</div><div class="kpi-val" style="color:#e11d48">${gap > 0 ? fmt(gap) : '✨ Meta atingida'}</div></div>
      </div>`;
    }

    if (showFab) {
      html += `<h3>🏭 Por Fábrica</h3><div>`;
      FABS.forEach((f, i) => {
        const r2 = gv(D, v.k, f, m);
        const mt2 = gm(D, v.k, f, m);
        const p2 = mt2 > 0 ? (r2 / mt2 * 100).toFixed(1) + '%' : '—';
        html += `<div class="fab-row-rpt">
          <span style="min-width:80px;font-weight:800;color:${FC[f]}">${FLAB[i]}</span>
          <span style="flex:1;font-family:monospace;font-weight:700">${fmt(r2)}</span>
          <span style="color:#64748b;font-size:11px">${mt2 > 0 ? 'meta: ' + fmt(mt2) : 'sem meta'}</span>
          <span style="font-weight:800;font-family:monospace;color:${p2 !== '—' && parseFloat(p2) >= 100 ? '#059669' : '#dc2626'};min-width:60px;text-align:right">${p2}</span>
        </div>`;
      });
      html += `</div>`;
    }

    if (showAbc) {
      let clients;
      if (m === 'all') {
          // Accumulate from ABC_ACUM if we had it, but here we construct it by summing all active months
          const map = {};
          MONTHS.forEach(mk => {
              const src = APP_DATA[`ABC_${mk.toUpperCase()}`];
              if (src && src[v.l]) {
                  src[v.l].forEach(c => {
                      if (!map[c.n]) map[c.n] = { ...c, v: 0 };
                      map[c.n].v += c.v;
                  });
              }
          });
          clients = Object.values(map).sort((a,b) => b.v - a.v);
      } else {
          const src = APP_DATA[`ABC_${m.toUpperCase()}`];
          clients = src ? (src[v.l] || []) : [];
      }
      
      if (clients && clients.length > 0) {
        html += `<h3>⭐ Clientes ABC (Top 20)</h3><table>
          <tr><th>#</th><th>Cliente</th><th>Cidade</th><th>Valor</th><th>Curva</th></tr>`;
        clients.slice(0, 20).forEach((c, i) => { html += `<tr><td>${i + 1}</td><td>${c.n}</td><td>${c.cd || '—'}</td><td style="font-family:monospace;font-weight:700">${fmt(c.v)}</td><td><span class="badge ${c.a}">${c.a}</span></td></tr>`; });
        html += `</table>`;
      }
    }
    html += `</div>`;
  });

  if (showRank && vendors.length > 1) {
    const sorted = [...vendors].sort((a, b) => gv(D, b.k, 'total', m) - gv(D, a.k, 'total', m));
    html += `<div class="rpt-section"><h2>🏆 Ranking de Vendedores</h2><table>
      <tr><th>#</th><th>Vendedor</th><th>Faturamento</th><th>Meta</th><th>% Meta</th></tr>`;
    sorted.forEach((v, i) => {
      const r = gv(D, v.k, 'total', m);
      const mt = gm(D, v.k, 'total', m);
      const p = mt > 0 ? (r / mt * 100).toFixed(1) + '%' : '—';
      html += `<tr><td><strong>${i + 1}º</strong></td><td style="font-weight:700;color:${v.c}">${v.l}</td><td style="font-family:monospace;font-weight:700">${fmt(r)}</td><td style="font-family:monospace">${mt > 0 ? fmt(mt) : '—'}</td><td style="font-weight:800;color:${parseFloat(p) >= 100 ? '#059669' : '#dc2626'}">${p}</td></tr>`;
    });
    html += `</table></div>`;
  }

  html += `<div style="text-align:center;color:#94a3b8;font-size:10px;margin-top:20px">Relatório gerado pelo Dashboard Comercial 2026 · Izair Borba & Cia Ltda</div></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `relatorio-comercial-2026-${m}.html`;
  a.click();
  closeModal('report');
}

export async function generateExcelReport() {
  if (!APP_DATA) return;
  const { VND_LIST } = APP_DATA;
  const vendors = rptVendors.has('all') ? VND_LIST : VND_LIST.filter(v => rptVendors.has(v.k));
  const monthSel = document.getElementById('rpt-excel-month');
  const month = monthSel ? parseInt(monthSel.value) : 4;
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const monthLabel = monthNames[month - 1];

  // Show loading state on the button
  const btn = document.querySelector('[onclick="generateExcelReport()"]');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '⏳ Gerando...'; btn.disabled = true; }

  try {
    // Fetch weekly data for all selected vendors
    const fetchPromises = vendors.map(v =>
      fetch(`/api/data/weekly-report?vendor=${v.k}&month=${month}`)
        .then(r => r.json())
    );
    const allData = await Promise.all(fetchPromises);

    // Create workbook with ExcelJS
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Dashboard Comercial 2026';
    wb.created = new Date();

    // Style constants
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    const subHeaderFont = { bold: false, color: { argb: 'FFFFFFFF' }, size: 9, name: 'Calibri' };
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

    allData.forEach(data => {
      if (!data || !data.suppliers || data.suppliers.length === 0) return;

      const ws = wb.addWorksheet(data.vendorLabel.substring(0, 31)); // Sheet name max 31 chars
      const numWeeks = data.weeks.length;
      const totalCols = 2 + numWeeks + 1; // VENDEDOR + FORNECEDOR + weeks + TOTAL

      // --- Row 1: Main headers ---
      const headers = ['VENDEDOR', 'FORNECEDOR'];
      data.weeks.forEach(w => headers.push(w.label));
      headers.push('TOTAL');

      const headerRow = ws.addRow(headers);
      headerRow.height = 22;
      headerRow.eachCell((cell, colNumber) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = thinBorder;
      });

      // --- Row 2: Sub-headers (date ranges) ---
      const subHeaders = ['', ''];
      data.weeks.forEach(w => subHeaders.push(w.range));
      subHeaders.push('');

      const subRow = ws.addRow(subHeaders);
      subRow.height = 18;
      subRow.eachCell((cell, colNumber) => {
        cell.fill = headerFill;
        cell.font = subHeaderFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = thinBorder;
      });

      // --- Data rows ---
      data.suppliers.forEach((supplier, idx) => {
        const displayName = supplier.product
          ? `${supplier.name} (${supplier.product})`
          : supplier.name;
        
        const rowData = [data.vendorLabel, displayName];
        supplier.weekValues.forEach(v => rowData.push(v || 0));
        rowData.push(supplier.total || 0);

        const row = ws.addRow(rowData);
        row.height = 18;

        // Apply styles to each cell
        row.eachCell((cell, colNumber) => {
          cell.font = dataFont;
          cell.border = thinBorder;
          
          if (colNumber === 1) {
            // VENDEDOR column
            cell.font = boldDataFont;
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else if (colNumber === 2) {
            // FORNECEDOR column
            cell.font = boldDataFont;
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else {
            // Value columns (weeks + total)
            cell.numFmt = currencyFormat;
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            if (colNumber === totalCols) {
              cell.font = boldDataFont;
            }
          }
        });

        // Alternating row colors
        if (idx % 2 === 0) {
          row.eachCell(cell => {
            if (!cell.fill || cell.fill.type !== 'pattern') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
          });
        }
      });

      // --- Grand Total row ---
      const grandRow = ['', '► TOTAL GERAL'];
      data.grandTotal.weekValues.forEach(v => grandRow.push(v));
      grandRow.push(data.grandTotal.total);

      const totalRowExcel = ws.addRow(grandRow);
      totalRowExcel.height = 22;
      totalRowExcel.eachCell((cell, colNumber) => {
        cell.fill = totalFill;
        cell.font = totalFont;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle' };
        
        if (colNumber <= 2) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          cell.numFmt = currencyFormat;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });

      // --- Column widths ---
      ws.getColumn(1).width = 18;  // VENDEDOR
      ws.getColumn(2).width = 50;  // FORNECEDOR
      for (let i = 0; i < numWeeks; i++) {
        ws.getColumn(3 + i).width = 18; // SEMANA columns
      }
      ws.getColumn(totalCols).width = 18; // TOTAL

      // Freeze top 2 rows
      ws.views = [{ state: 'frozen', ySplit: 2, xSplit: 2 }];
    });

    // Generate and download the file
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-semanal-${monthLabel.toLowerCase()}-2026.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);

    closeModal('report');
  } catch (err) {
    console.error('Erro ao gerar Excel:', err);
    alert('Erro ao gerar relatório Excel. Verifique se há dados importados para o mês selecionado.');
  } finally {
    if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
  }
}
