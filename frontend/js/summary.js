import { fmt, pN, scColor, scLabel } from './utils.js';
import { buildSummary } from './summary-model.js';

const RESUMO_PRIVACY_KEY = 'isadora.resumo.hide-values';
const HIDDEN_VALUE = '••••••';
let resumoValuesHidden = false;
try { resumoValuesHidden = localStorage.getItem(RESUMO_PRIVACY_KEY) === 'true'; } catch {}

const money = value => resumoValuesHidden ? HIDDEN_VALUE : fmt(value);
const percent = value => value === null ? '—' : `${value.toFixed(1)}%`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const progress = value => Math.min(100, Math.max(0, value || 0));
const achievementColor = (summary, value) => summary.month === 'all' && value !== null && value >= 0 && value < 100 ? '#2563eb' : scColor(value);
const rank = index => `<span class="rb ${index < 3 ? `r${index + 1}` : 'rn'}">${index + 1}</span>`;

function updatePrivacyButton() {
    const button = document.getElementById('resumo-toggle-values');
    if (!button) return;
    const label = resumoValuesHidden ? 'Mostrar valores financeiros' : 'Ocultar valores financeiros';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(resumoValuesHidden));
    button.title = label;
}

export function toggleResumoValues() {
    resumoValuesHidden = !resumoValuesHidden;
    try { localStorage.setItem(RESUMO_PRIVACY_KEY, String(resumoValuesHidden)); } catch {}
    updatePrivacyButton();
}

function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

export function renderResumo(data, month, mode, oldBar, oldDonut, oldFactoryBar) {
    updatePrivacyButton();
    const summary = buildSummary(data, month);
    const { vendors, realized, target, achievement, gap, periodLabel, targetLabel } = summary;
    const monthSelect = document.getElementById('resumo-month');
    if (monthSelect) monthSelect.value = summary.month;
    setText('resumo-subtitle', `${vendors.length} vendedores · ${periodLabel}`);
    setText('resumo-period-label', periodLabel);
    setText('resumo-target-note', summary.month === 'all'
        ? 'O acumulado reúne as vendas de 2026 e compara o realizado com a meta anual.'
        : 'A meta mensal é o saldo da meta anual após as vendas dos meses anteriores, dividido pelos meses restantes.');
    setText('resumo-vendors-note', `Ordenados pelo faturamento · ${periodLabel}`);
    setText('resumo-ranking-note', `Valores e metas do mesmo período · ${periodLabel}`);
    setText('resumo-factories-note', `Faturamento e participação · ${periodLabel}`);
    setText('resumo-bar-note', mode === 'pct' ? `Atingimento da ${targetLabel.toLowerCase()}` : `Realizado e ${targetLabel.toLowerCase()}`);
    document.getElementById('resumo-bar')?.setAttribute('aria-label', mode === 'pct' ? 'Atingimento da meta por vendedor' : 'Comparativo do realizado e da meta por vendedor');
    for (const [id, value] of [['tog-abs', 'abs'], ['tog-pct', 'pct']]) {
        document.getElementById(id)?.setAttribute('aria-pressed', String(mode === value));
    }
    const notices = [];
    if (!summary.hasSales) notices.push('Não há faturamento registrado neste período.');
    if (summary.missingTargets) notices.push(`${summary.missingTargets} ${summary.missingTargets === 1 ? 'vendedor sem meta anual definida' : 'vendedores sem meta anual definida'}.`);
    if (!summary.totalsMatch) notices.push('O total por fábrica difere do faturamento consolidado. Confira os lançamentos e a classificação das fábricas.');
    const notice = document.getElementById('resumo-notice');
    if (notice) { notice.hidden = notices.length === 0; notice.textContent = notices.join(' '); }

    const kpis = [
        { label: 'Faturamento total', value: money(realized), sub: periodLabel, color: '#2563eb' },
        { label: targetLabel, value: target > 0 ? money(target) : '—', sub: summary.month === 'all' ? 'Objetivo de 2026' : 'Meta recalculada para o mês', color: '#7c3aed' },
        { label: 'Atingimento da meta', value: percent(achievement), sub: summary.month === 'all' && achievement !== null ? (achievement >= 100 ? 'Meta anual atingida' : 'Do objetivo anual realizado') : scLabel(achievement), color: achievementColor(summary, achievement), bar: achievement },
        { label: 'Saldo para a meta', value: gap === null ? '—' : money(gap), sub: gap === null ? 'Sem meta para o período' : gap === 0 ? 'Meta atingida' : 'Falta realizar no período', color: '#e11d48' },
        { label: 'Vendedores com vendas', value: `${summary.vendorsWithSales} / ${vendors.length}`, sub: 'Equipe com movimentação no período', color: '#0891b2' },
    ];
    const kpiElement = document.getElementById('kpi-resumo');
    if (kpiElement) kpiElement.innerHTML = kpis.map(kpi => `<div class="kpi" style="--kc:${kpi.color}">
        <div class="kpi-lbl">${kpi.label}</div><div class="kpi-val" style="color:${kpi.color}">${kpi.value}</div>
        <div class="kpi-sub">${kpi.sub}</div>${kpi.bar !== undefined && kpi.bar !== null ? `<div class="prog-bg"><div class="prog-fill" style="width:${progress(kpi.bar)}%;background:${kpi.color}"></div></div>` : ''}
    </div>`).join('');

    const cards = document.getElementById('resumo-cards');
    if (cards) cards.innerHTML = vendors.map((vendor, index) => `<button type="button" class="resumo-card" style="--rc:${vendor.c}" data-vendor="${escape(vendor.k)}" aria-label="Ver perfil de ${escape(vendor.l)}">
        <div class="rc-header"><div class="rc-av" style="border-color:${vendor.c}"><img src="assets/img/avatar_${escape(vendor.k)}.png" alt="" onerror="this.style.display='none'"></div>
            <div class="rc-identity"><div class="rc-name">${escape(vendor.l)}</div><div class="rc-ped">${index + 1}º em faturamento${vendor.active === false ? ' · Inativo' : ''}</div></div>
            <span class="rc-pct" style="background:${achievementColor(summary, vendor.achievement)}18;color:${achievementColor(summary, vendor.achievement)}">${percent(vendor.achievement)}</span></div>
        <div class="rc-row"><span class="rc-k">Realizado</span><span class="rc-v">${money(vendor.realized)}</span></div>
        <div class="rc-row"><span class="rc-k">${targetLabel}</span><span class="rc-v">${vendor.target > 0 ? money(vendor.target) : '—'}</span></div>
        <div class="prog-bg"><div class="prog-fill" style="width:${progress(vendor.achievement)}%;background:${achievementColor(summary, vendor.achievement)}"></div></div>
    </button>`).join('');
    cards?.querySelectorAll('[data-vendor]').forEach(button => {
        button.addEventListener('click', () => window.goPage(button.dataset.vendor));
    });

    const header = document.getElementById('rank-header-row');
    if (header) header.innerHTML = `<th scope="col">#</th><th scope="col">Vendedor</th><th scope="col">Realizado</th><th scope="col">${targetLabel}</th><th scope="col">Saldo para a meta</th><th scope="col">Atingimento</th>`;
    const table = document.getElementById('resumo-table');
    if (table) table.innerHTML = vendors.map((vendor, index) => `<tr><td>${rank(index)}</td>
        <th scope="row"><span class="resumo-table-vendor"><img src="assets/img/avatar_${escape(vendor.k)}.png" alt="" onerror="this.style.display='none'">${escape(vendor.l)}${vendor.active === false ? '<span class="resumo-inactive">Inativo</span>' : ''}</span></th>
        <td class="mn">${money(vendor.realized)}</td><td class="mn">${vendor.target > 0 ? money(vendor.target) : '—'}</td>
        <td class="mn">${vendor.gap === null ? '—' : money(vendor.gap)}</td>
        <td><span class="resumo-achievement" style="color:${achievementColor(summary, vendor.achievement)}">${percent(vendor.achievement)}</span></td></tr>`).join('') || '<tr><td colspan="6">Nenhum vendedor disponível.</td></tr>';
    const footer = document.getElementById('resumo-table-total');
    if (footer) footer.innerHTML = `<tr><th colspan="2" scope="row">Total da equipe</th><td class="mn">${money(realized)}</td><td class="mn">${target > 0 ? money(target) : '—'}</td><td class="mn">${gap === null ? '—' : money(gap)}</td><td class="resumo-achievement">${percent(achievement)}</td></tr>`;
    const factoryRank = document.getElementById('fab-rank');
    if (factoryRank) factoryRank.innerHTML = summary.factories.map((factory, index) => `<div class="resumo-factory-row">
        ${rank(index)}<span class="resumo-factory-name"><span class="resumo-color-dot" style="background:${factory.color}"></span>${factory.label}</span>
        <div class="resumo-factory-values"><strong>${money(factory.realized)}</strong><span>${factory.share === null ? 'Participação indisponível' : `${percent(factory.share)} do total`} · ${factory.achievement === null ? 'Sem meta' : `${percent(factory.achievement)} da meta`}</span></div>
        <div class="prog-bg"><div class="prog-fill" style="width:${progress(factory.share)}%;background:${factory.color}"></div></div>
    </div>`).join('');

    return {
        resumoBarChart: renderResumoBar(summary, mode, oldBar),
        resumoDonutChart: renderResumoDonut(summary, oldDonut),
        fabBarChart: renderFabRank(summary, oldFactoryBar),
    };
}

function amountTick(value) {
    return resumoValuesHidden ? HIDDEN_VALUE : Number(value).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
}

function chartState(canvasId, emptyId, oldChart, visible, message) {
    oldChart?.destroy();
    const canvas = document.getElementById(canvasId);
    const empty = document.getElementById(emptyId);
    if (canvas) canvas.hidden = !visible;
    if (empty) { empty.hidden = visible; empty.textContent = message; }
    return visible ? canvas?.getContext('2d') : null;
}

const chartOptions = () => ({ responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16, font: { size: 11 } } } },
});

export function renderResumoBar(summary, mode, oldChart) {
    const ctx = chartState('resumo-bar', 'resumo-bar-empty', oldChart,
        summary.vendors.length > 0 && (mode === 'pct' ? summary.target > 0 : summary.hasSales || summary.target > 0),
        mode === 'pct' ? 'Defina metas para visualizar o atingimento da equipe.' : 'Sem vendas ou metas neste período.');
    if (!ctx) return null;
    const percentMode = mode === 'pct';
    const datasets = percentMode ? [{ label: 'Atingimento da meta', data: summary.vendors.map(vendor => vendor.achievement), backgroundColor: summary.vendors.map(vendor => achievementColor(summary, vendor.achievement)), borderRadius: 4 }]
        : [{ label: 'Realizado', data: summary.vendors.map(vendor => vendor.realized), backgroundColor: '#2563eb', borderRadius: 4 },
            { label: summary.targetLabel, data: summary.vendors.map(vendor => vendor.target > 0 ? vendor.target : null), backgroundColor: '#cbd5e1', borderRadius: 4 }];
    const options = chartOptions();
    options.indexAxis = 'y';
    options.plugins.tooltip = { callbacks: { label: context => ` ${context.dataset.label}: ${percentMode ? percent(context.raw) : money(context.raw)}` } };
    options.scales = { x: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: value => percentMode ? `${value}%` : amountTick(value), font: { size: 10 } } },
        y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } } };
    return new Chart(ctx, { type: 'bar', data: { labels: summary.vendors.map(vendor => vendor.l), datasets }, options });
}

export function renderResumoDonut(summary, oldChart) {
    const ctx = chartState('resumo-donut', 'resumo-donut-empty', oldChart, summary.canShowDistribution,
        summary.factories.some(factory => factory.realized < 0) ? 'Há valores negativos neste período. Confira os ajustes no ranking de fábricas.' : 'Sem faturamento por fábrica neste período.');
    if (!ctx) return null;
    const factories = summary.factories.filter(factory => factory.realized > 0);
    const options = chartOptions();
    options.cutout = '68%';
    options.plugins.tooltip = { callbacks: { label: context => ` ${money(context.raw)} · ${percent(pN(context.raw, summary.factoryTotal))}` } };
    return new Chart(ctx, { type: 'doughnut', data: { labels: factories.map(factory => factory.label), datasets: [{ data: factories.map(factory => factory.realized), backgroundColor: factories.map(factory => factory.color), borderWidth: 3, borderColor: '#fff', hoverOffset: 4 }] }, options });
}

export function renderFabRank(summary, oldChart) {
    const ctx = chartState('fab-bar', 'fab-bar-empty', oldChart, summary.factories.some(factory => factory.realized !== 0), 'Sem faturamento por fábrica neste período.');
    if (!ctx) return null;
    const options = chartOptions();
    options.indexAxis = 'y';
    options.plugins.legend.display = false;
    options.plugins.tooltip = { callbacks: { label: context => ` ${money(context.raw)}` } };
    options.scales = { x: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: amountTick, font: { size: 10 } } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } };
    return new Chart(ctx, { type: 'bar', data: { labels: summary.factories.map(factory => factory.label), datasets: [{ label: 'Realizado', data: summary.factories.map(factory => factory.realized), backgroundColor: summary.factories.map(factory => factory.color), borderRadius: 5, maxBarThickness: 30 }] }, options });
}
