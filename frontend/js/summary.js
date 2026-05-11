/**
 * Summary and Global Ranking Module
 * Fully dynamic — supports all 12 months.
 */
import { FABS, FLAB, FC, MONTHS, MONTH_LABELS, MONTH_COLORS } from './constants.js';
import { fmt, pN, pS, scColor, scBg, scLabel } from './utils.js';
import { gv, gm } from './data-helpers.js';

export function renderResumo(APP_DATA, mesResumo, resumoMode, resumoBarChart, resumoDonutChart, fabBarChart) {
    const { D, VND_LIST } = APP_DATA;
    const m = mesResumo;
    const totalReal = VND_LIST.reduce((a, v) => a + gv(D, v.k, 'total', m), 0);
    const totalMeta = VND_LIST.reduce((a, v) => a + gm(D, v.k, 'total', m), 0);
    const totalMa = VND_LIST.reduce((a, v) => a + (D[v.k]?.total?.ma || 0), 0);
    const pT = pN(totalReal, totalMeta);
    const gapT = totalMeta > 0 ? Math.max(0, totalMeta - totalReal) : 0;

    // Dynamic pedidos count
    const pedKey = { jan:'pj', fev:'pf', mar:'pm', abr:'pa', mai:'pmai', jun:'pjun', jul:'pjul', ago:'pago', set:'pset', out:'pout', nov:'pnov', dez:'pdez' };
    let totalPed;
    if (m === 'all') {
        totalPed = VND_LIST.reduce((a, v) => {
            return a + Object.values(pedKey).reduce((s, pk) => s + (v[pk] || 0), 0);
        }, 0);
    } else {
        totalPed = VND_LIST.reduce((a, v) => a + (v[pedKey[m]] || 0), 0);
    }

    const periodLabel = m === 'all' ? 'Acumulado' : (MONTH_LABELS[m] || m);

    const kpiResumo = document.getElementById('kpi-resumo');
    if (kpiResumo) {
        kpiResumo.innerHTML = [
            { l: 'Faturamento Total', v: fmt(totalReal), s: periodLabel, c: '#2563eb', bar: null },
            { l: 'Meta Total', v: fmt(totalMeta), s: 'toda a equipe', c: '#7c3aed', bar: null },
            { l: '% Meta', v: pT !== null ? pT.toFixed(1) + '%' : '—', s: scLabel(pT), c: scColor(pT), bar: pT },
            { l: 'Gap', v: gapT > 0 ? fmt(gapT) : 'R$ 0,00', s: 'necessário', c: '#e11d48', bar: null },
            { l: 'Pedidos', v: totalPed.toString(), s: 'toda a equipe', c: '#0891b2', bar: null },
        ].map((k, i) => `
            <div class="kpi" style="--kc:${k.c};animation-delay:${i * .05}s">
                <div class="kpi-lbl">${k.l}</div>
                <div class="kpi-val" style="color:${k.c}">${k.v}</div>
                <div class="kpi-sub">${k.s}</div>
                ${k.bar !== null ? `<div class="prog-bg"><div class="prog-fill" style="width:${Math.min(100, Math.max(0, k.bar))}%;background:${k.c}"></div></div>` : ''}
            </div>`).join('');
    }

    const sorted = [...VND_LIST].sort((a, b) => gv(D, b.k, 'total', m) - gv(D, a.k, 'total', m));
    
    // Vendor cards
    const resumoCards = document.getElementById('resumo-cards');
    if (resumoCards) {
        resumoCards.innerHTML = sorted.map(v => {
            const r = gv(D, v.k, 'total', m), mt = gm(D, v.k, 'total', m), ma = D[v.k]?.total?.ma || 0;
            const p2 = pN(r, mt), sc2 = scColor(p2);
            let ped;
            if (m === 'all') {
                ped = Object.values(pedKey).reduce((s, pk) => s + (v[pk] || 0), 0);
            } else {
                ped = v[pedKey[m]] || 0;
            }
            return `<div class="resumo-card" style="--rc:${v.c}" onclick="goPage('${v.k}')">
                <div class="rc-header">
                    <div class="rc-av" style="border-color:${v.c}">
                        <img src="assets/img/avatar_${v.k}.png" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">
                    </div>
                    <div><div class="rc-name">${v.l}</div><div class="rc-ped">${ped} pedidos</div></div>
                    <span class="rc-pct" style="background:${sc2}18;color:${sc2}">${p2 !== null ? p2.toFixed(1) + '%' : '—'}</span>
                </div>
                <div class="rc-row"><span class="rc-k">Realizado</span><span class="rc-v" style="color:${v.c}">${fmt(r)}</span></div>
                <div class="rc-row"><span class="rc-k">Meta Mês</span><span class="rc-v">${mt > 0 ? fmt(mt) : '—'}</span></div>
                <div class="rc-row"><span class="rc-k">% do Ano</span><span class="rc-v" style="color:${scColor(pN(r, ma))}">${ma > 0 ? pS(r, ma) : '—'}</span></div>
                <div class="prog-bg" style="margin-top:8px"><div class="prog-fill" style="width:${mt > 0 ? Math.min(100, r / mt * 100) : 0}%;background:${sc2}"></div></div>
            </div>`;
        }).join('');
    }

    // Ranking table — dynamic columns for all months with data
    const resumoTable = document.getElementById('resumo-table');
    if (resumoTable) {
        // Detect which months have data
        const activeMonths = MONTHS.filter(mk =>
            VND_LIST.some(v => (D[v.k]?.total?.[mk] || 0) > 0)
        );

        // Update headers dynamically
        const headerRow = document.getElementById('rank-header-row');
        if (headerRow) {
            headerRow.innerHTML = `
                <th>#</th>
                <th>Vendedor</th>
                ${activeMonths.map(mk => `<th>${MONTH_LABELS[mk]}</th>`).join('')}
                <th>Total Realizado</th>
                <th>Meta Período</th>
                <th>Meta Anual</th>
                <th style="width:150px">Atingimento</th>
            `;
        }

        resumoTable.innerHTML = sorted.map((v, i) => {
            const monthVals = activeMonths.map(mk => D[v.k]?.total?.[mk] || 0);
            const acumV = monthVals.reduce((a, b) => a + b, 0);
            const ma = D[v.k]?.total?.ma || 0;
            // Use gm for the specific month selected
            const currentMeta = gm(D, v.k, 'total', m);
            const s = pN(gv(D, v.k, 'total', m), currentMeta);
            
            return `<tr>
                <td><span class="rb ${i < 3 ? 'r' + (i + 1) : 'rn'}">${i + 1}</span></td>
                <td><div style="display:flex;align-items:center;gap:8px">
                    <img src="assets/img/avatar_${v.k}.png" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid ${v.c}" onerror="this.style.display='none'">
                    <span style="font-weight:600">${v.l}</span>
                </div></td>
                ${monthVals.map((mv, idx) => {
                    const monthMeta = gm(D, v.k, 'total', activeMonths[idx]);
                    const p = pN(mv, monthMeta);
                    return `<td class="mn">
                        <div>${fmt(mv)}</div>
                        <div style="font-size:9px;color:${scColor(p)}">${p !== null ? p.toFixed(0) + '%' : ''}</div>
                    </td>`;
                }).join('')}
                <td class="mn" style="font-weight:700">${fmt(acumV)}</td>
                <td class="mn">${currentMeta > 0 ? fmt(currentMeta) : '—'}</td>
                <td class="mn">${ma > 0 ? fmt(ma) : '—'}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px">
                        <div class="prog-bg" style="flex:1;height:6px"><div class="prog-fill" style="width:${Math.min(100, s || 0)}%;background:${scColor(s)}"></div></div>
                        <span style="font-weight:700;color:${scColor(s)};font-size:11px">${s !== null ? s.toFixed(1) + '%' : '—'}</span>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    const newBarChart = renderResumoBar(APP_DATA, resumoMode, resumoBarChart);
    const newDonutChart = renderResumoDonut(APP_DATA, resumoDonutChart);
    const newFabBarChart = renderFabRank(APP_DATA, fabBarChart);
    
    return { resumoBarChart: newBarChart, resumoDonutChart: newDonutChart, fabBarChart: newFabBarChart };
}

export function renderResumoBar(APP_DATA, resumoMode, resumoBarChart) {
    const { D, VND_LIST } = APP_DATA;
    if (resumoBarChart) resumoBarChart.destroy();
    const ctx = document.getElementById('resumo-bar')?.getContext('2d');
    if (!ctx) return null;
    
    // Only create datasets for months that have data
    const activeMonths = MONTHS.filter(mk =>
        VND_LIST.some(v => (D[v.k]?.total?.[mk] || 0) > 0)
    );

    const datasets = activeMonths.map((mk, idx) => ({
        label: MONTH_LABELS[mk],
        data: VND_LIST.map(v => resumoMode === 'abs' ? (D[v.k]?.total?.[mk] || 0) : pN(D[v.k]?.total?.[mk] || 0, gm(D, v.k, 'total', mk)) || 0),
        backgroundColor: VND_LIST.map(v => v.c + (MONTH_COLORS[idx] ? 'bb' : 'cc')),
        borderColor: VND_LIST.map(v => v.c),
        borderWidth: 1,
        borderRadius: 4
    }));

    return new Chart(ctx, {
        type: 'bar',
        data: { labels: VND_LIST.map(v => v.l), datasets },
        options: {
            responsive: true, plugins: { legend: { labels: { color: '#475569', font: { family: 'JetBrains Mono', size: 9 } } }, tooltip: { callbacks: { label: c2 => resumoMode === 'abs' ? ' ' + fmt(c2.raw) : ' ' + c2.raw.toFixed(1) + '%' } } },
            scales: { x: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 9 } } }, y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', callback: v => resumoMode === 'abs' ? v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : v.toFixed(0) + '%' } } }
        }
    });
}

export function renderResumoDonut(APP_DATA, resumoDonutChart) {
    const { D, VND_LIST } = APP_DATA;
    if (resumoDonutChart) resumoDonutChart.destroy();
    const ctx = document.getElementById('resumo-donut')?.getContext('2d');
    if (!ctx) return null;
    
    const fabTot = FABS.map(f => VND_LIST.reduce((a, v) =>
        a + MONTHS.reduce((s, mk) => s + (D[v.k]?.[f]?.[mk] || 0), 0)
    , 0));
    const gt = fabTot.reduce((a, b) => a + b, 0);
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: { labels: FLAB, datasets: [{ data: fabTot, backgroundColor: FABS.map(f => FC[f] + 'cc'), borderColor: FABS.map(f => FC[f]), borderWidth: 2, hoverOffset: 8 }] },
        options: {
            responsive: true, cutout: '60%', plugins: {
                legend: { position: 'bottom', labels: { color: '#475569', font: { family: 'JetBrains Mono', size: 10 }, padding: 12 } },
                tooltip: { callbacks: { label: c2 => ` ${fmt(c2.raw)} (${gt > 0 ? (c2.raw / gt * 100).toFixed(1) : 0}%)` } }
            }
        }
    });
}

export function renderFabRank(APP_DATA, fabBarChart) {
    const { D, VND_LIST } = APP_DATA;
    if (fabBarChart) fabBarChart.destroy();
    
    // Detect active months
    const activeMonths = MONTHS.filter(mk =>
        VND_LIST.some(v => FABS.some(f => (D[v.k]?.[f]?.[mk] || 0) > 0))
    );

    const fabTot = FABS.map((f, i) => {
        const monthTotals = {};
        let total = 0;
        activeMonths.forEach(mk => {
            const val = VND_LIST.reduce((a, v) => a + (D[v.k]?.[f]?.[mk] || 0), 0);
            monthTotals[mk] = val;
            total += val;
        });
        const meta = VND_LIST.reduce((a, v) => a + (D[v.k]?.[f]?.ma || (D[v.k]?.[f]?.mm * 12) || 0), 0);
        return { f, label: FLAB[i], total, monthTotals, meta };
    }).sort((a, b) => b.total - a.total);
    
    const gt = fabTot.reduce((a, x) => a + x.total, 0);
    const rankEl = document.getElementById('fab-rank');
    if (rankEl) {
        rankEl.innerHTML = '<div class="ct" style="margin-bottom:4px">Ranking de Fábricas</div><div class="cs">PARTICIPAÇÃO NO FATURAMENTO TOTAL</div>' +
            fabTot.map((x, i) => `<div class="fab-row">
                <span class="rb ${i < 3 ? 'r' + (i + 1) : 'rn'}" style="margin-right:4px">${i + 1}</span>
                <span class="fab-tag" style="background:${FC[x.f]}18;color:${FC[x.f]};border:1px solid ${FC[x.f]}44">${x.label}</span>
                <div style="flex:1;margin:0 10px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                        <span style="font-size:11px;font-family:var(--mono);font-weight:700;color:${FC[x.f]}">${fmt(x.total)}</span>
                        <span style="font-size:9px;color:var(--text3)">${gt > 0 ? (x.total / gt * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div class="fab-bar-wrap"><div class="fab-bar-fill" style="width:${x.meta > 0 ? Math.min(100, x.total / x.meta * 100) : (gt > 0 ? x.total / gt * 100 : 0)}%;background:${FC[x.f]}"></div></div>
                </div>
                <span style="font-family:var(--mono);font-size:10px;color:${scColor(pN(x.total, x.meta))};font-weight:700;width:48px;text-align:right">${x.meta > 0 ? pS(x.total, x.meta) : '—'}</span>
            </div>`).join('');
    }
    
    const ctx = document.getElementById('fab-bar')?.getContext('2d');
    if (!ctx) return null;

    const datasets = activeMonths.map((mk, idx) => ({
        label: MONTH_LABELS[mk],
        data: fabTot.map(x => x.monthTotals[mk] || 0),
        backgroundColor: fabTot.map(x => FC[x.f] + ['bb','55','88','aa','cc','33','66','99','dd','44','77','ee'][idx % 12]),
        borderColor: fabTot.map(x => FC[x.f]),
        borderWidth: 1,
        borderRadius: 4
    }));

    return new Chart(ctx, {
        type: 'bar',
        data: { labels: fabTot.map(x => x.label), datasets },
        options: {
            responsive: true, plugins: { legend: { labels: { color: '#475569', font: { family: 'JetBrains Mono', size: 10 } } }, tooltip: { callbacks: { label: c2 => ' ' + fmt(c2.raw) } } },
            scales: { x: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b' } }, y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', callback: v => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) } } }
        }
    });
}
