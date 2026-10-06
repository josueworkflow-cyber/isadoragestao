import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary } from '../js/summary-model.js';
import { createSummaryFixture } from './fixtures/summary-data.mjs';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} differs from ${expected}`);

test('annual consolidated totals reconcile with factories, including inactive vendors', () => {
    const data = createSummaryFixture();
    const original = JSON.stringify(data);
    const summary = buildSummary(data);
    assert.equal(summary.realized, 340000);
    assert.equal(summary.target, 984000);
    assert.equal(summary.gap, 644000);
    near(summary.achievement, 34.552845528455286);
    assert.equal(summary.factoryTotal, 340000);
    assert.equal(summary.factories[0].realized, 170000);
    assert.equal(summary.factories[0].share, 50);
    assert.equal(summary.vendors.length, 10);
    assert.equal(summary.vendors.find(v => v.k === 'tiago').realized, 9000);
    assert.equal(summary.missingTargets, 1);
    assert.equal(summary.totalsMatch, true);
    assert.equal(JSON.stringify(data), original);
});

test('month affects all financial metrics, ranking and factory distribution', () => {
    const summary = buildSummary(createSummaryFixture(), 'fev');
    assert.equal(summary.realized, 100000);
    near(summary.target, 887000 / 11);
    near(summary.achievement, 100000 / (887000 / 11) * 100);
    assert.equal(summary.gap, 0);
    assert.equal(summary.vendors[0].k, 'jairo');
    assert.equal(summary.vendors[0].realized, 21000);
    near(summary.vendors[0].target, 108000 / 11);
    assert.equal(summary.factories[0].realized, 50000);
    assert.equal(summary.factories[0].share, 50);
    assert.equal(summary.vendorsWithSales, 9);
    assert.equal(summary.targetLabel, 'Meta do mês');
});

test('overachievement, absence of targets and empty months do not invent percentages', () => {
    const march = buildSummary(createSummaryFixture(), 'mar');
    assert.equal(march.target, 78700);
    assert.equal(march.gap, 0);
    assert.ok(march.achievement > 100);
    assert.equal(march.vendors.find(v => v.k === 'elberto').achievement, null);
    assert.equal(march.vendors.find(v => v.k === 'elberto').gap, null);
    const empty = buildSummary(createSummaryFixture(), 'abr');
    assert.equal(empty.realized, 0);
    assert.equal(empty.hasSales, false);
    assert.equal(empty.canShowDistribution, false);
    assert.equal(empty.factories[0].share, null);
    const noData = buildSummary({ D:{},VND_LIST:[] });
    assert.equal(noData.achievement, null);
    assert.equal(noData.gap, null);
});

test('monthly goals redistribute the annual balance and fall back to legacy monthly metas', () => {
    const data = { VND_LIST:[{k:'samuel',l:'Samuel',c:'#2563eb'}],D:{samuel:{total:{jan:30000,fev:10000,ma:120000}}} };
    near(buildSummary(data, 'fev').target, 90000 / 11);
    assert.equal(buildSummary(data, 'mar').target, 8000);
    data.D.samuel.total.ma = 0;
    data.D.samuel.total.metas = { jan:60000,fev:60000 };
    assert.equal(buildSummary(data).target, 120000);
    assert.equal(buildSummary(data).missingTargets, 0);
    data.D.samuel.total.jan = 130000;
    assert.equal(buildSummary(data, 'fev').target, 0);
    assert.equal(buildSummary(data, 'fev').achievement, null);
});

test('negative adjustments remain in totals but do not generate a misleading pie', () => {
    const data = createSummaryFixture();
    data.D.elberto.total.fev = -2500;
    data.D.elberto.outros.fev = -2500;
    const summary = buildSummary(data, 'fev');
    assert.equal(summary.realized, 97500);
    assert.equal(summary.factoryTotal, 97500);
    assert.equal(summary.totalsMatch, true);
    assert.equal(summary.canShowDistribution, false);
    assert.ok(summary.factories.every(factory => factory.share === null));
    assert.equal(summary.vendorsWithSales, 10);
});

test('detects mismatched factory totals and preserves the financial source', () => {
    const data = createSummaryFixture();
    data.D.samuel.total.jan += 500;
    const summary = buildSummary(data, 'jan');
    assert.equal(summary.realized, 100500);
    assert.equal(summary.factoryTotal, 100000);
    assert.equal(summary.totalsMatch, false);
});

test('rendering uses the same period for charts, ranking, empty states and privacy', async () => {
    const nodes = new Map();
    globalThis.document = { getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, { innerHTML:'',attributes:{},setAttribute(k,v){this.attributes[k]=v;},getContext(){return {};},querySelectorAll(){return [];} });
        return nodes.get(id);
    } };
    globalThis.localStorage = { value:'false',getItem(){return this.value;},setItem(k,v){this.value=v;} };
    globalThis.Chart = class { constructor(ctx,config){this.config=config;} destroy(){this.destroyed=true;} };
    try {
        const {renderResumo,toggleResumoValues} = await import('../js/summary.js');
        const data = createSummaryFixture();
        const before = renderResumo(data,'fev','abs');
        assert.equal(before.resumoBarChart.config.data.datasets[0].data[0],21000);
        near(before.resumoBarChart.config.data.datasets[1].data[0],108000/11);
        assert.equal(before.resumoDonutChart.config.data.datasets[0].data[0],50000);
        assert.equal(before.fabBarChart.config.data.datasets[0].data[0],50000);
        assert.match(nodes.get('resumo-table-total').innerHTML,/100\.000,00/);
        const pct = renderResumo(data,'fev','pct',before.resumoBarChart,before.resumoDonutChart,before.fabBarChart);
        assert.equal(before.resumoBarChart.destroyed,true);
        assert.equal(pct.resumoBarChart.config.data.datasets.length,1);
        assert.equal(nodes.get('tog-pct').attributes['aria-pressed'],'true');
        toggleResumoValues();
        const hidden = renderResumo(data,'fev','abs');
        for(const id of ['kpi-resumo','resumo-cards','resumo-table','resumo-table-total','fab-rank']) {
            assert.doesNotMatch(nodes.get(id).innerHTML,/R\$/);
            assert.match(nodes.get(id).innerHTML,/••••••/);
        }
        for(const key of ['resumoBarChart','resumoDonutChart','fabBarChart']) {
            const callback=hidden[key].config.options.plugins.tooltip.callbacks.label;
            assert.match(callback({raw:50000,dataset:{label:'Realizado'}}),/••••••/);
        }
        assert.equal(hidden.resumoBarChart.config.options.scales.x.ticks.callback(50000),'••••••');
        toggleResumoValues();
        assert.equal(localStorage.value,'false');
        const empty = renderResumo(data,'abr','abs');
        assert.equal(empty.resumoDonutChart,null);
        assert.equal(empty.fabBarChart,null);
        assert.equal(nodes.get('resumo-donut-empty').hidden,false);
        assert.equal(nodes.get('fab-bar').hidden,true);
        data.D.elberto.total.fev = -2500;
        data.D.elberto.outros.fev = -2500;
        const negative = renderResumo(data,'fev','abs');
        assert.equal(negative.resumoDonutChart,null);
        assert.match(nodes.get('resumo-donut-empty').textContent,/valores negativos/);
        assert.equal(negative.fabBarChart.config.data.datasets[0].data.at(-1),-2500);
    } finally {
        delete globalThis.document;delete globalThis.localStorage;delete globalThis.Chart;
    }
});
