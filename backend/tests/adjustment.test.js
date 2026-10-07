const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
let rows, records, conflict, transactionOptions;
const originalSale = value => ({
    vendorKey: 'samuel', factoryKey: 'pian', supplierName: 'PIAN ALIMENTOS LTDA', value,
    periodStart: new Date(2026, 0, 5), periodEnd: new Date(2026, 0, 9),
    import: { type: 'type1', periodYear: 2026, periodMonth: 1, periodWeek: 1 }
});
const db = {
    supplierSale: { findMany: async options => {
        assert.equal(options.where.import.periodYear, 2026);
        return rows.filter(s => s.import.periodYear === options.where.import.periodYear && (!options.where.vendorKey || s.vendorKey === options.where.vendorKey));
    } },
    meta: { findMany: async () => [] },
    import: { create: async ({ data }) => {
        const { supplierSales, ...fields } = data;
        const record = { id: records.length + 1, ...fields };
        records.push(record);
        rows.push({ ...supplierSales.create, import: record });
        return record;
    } },
    $transaction: async (callback, options) => {
        transactionOptions = options;
        if (conflict) throw Object.assign(new Error('Concurrent transaction'), { code: 'P2034' });
        return callback(db);
    }
};
const dbPath = require.resolve('../src/services/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: db };
const service = require('../src/services/adjustment-service');
const dataService = require('../src/services/data-service');
const scope = { vendorKey: 'samuel', factoryKey: 'pian', month: 1, year: 2026 };
let server, url;
before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/import', require('../src/routes/import'));
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    url = `http://127.0.0.1:${server.address().port}/api/import/adjustment`;
});
beforeEach(() => {
    rows = [originalSale(10000.08), { ...originalSale(50), factoryKey: 'nutri' }, { ...originalSale(9999), import: { type: 'type1', periodYear: 2025, periodMonth: 1 } }];
    records = [];
    conflict = false;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

test('preview includes previous adjustments, respects vendor, factory, year and commercial month', async () => {
    rows.push({ ...originalSale(-0.03), import: { type: 'adjustment', periodYear: 2026, periodMonth: 1 } });
    rows.push({ ...originalSale(500), vendorKey: 'celso' });
    rows.push({ ...originalSale(-1), import: { type: 'adjustment', periodYear: 2026, periodMonth: 2 } });
    const response = await fetch(`${url}?${new URLSearchParams(scope)}`);
    assert.equal(response.status, 200);
    const balance = await response.json();
    assert.equal(balance.currentValue, 10000.05);
    assert.equal(balance.vendorTotal, 10050.05);
    assert.equal(balance.adjustmentValue, -0.03);
});

test('correcting cents preserves imported records and reconciles dashboard, detail and weekly report', async () => {
    const original = JSON.stringify(rows[0]);
    const result = await service.saveAdjustment({ ...scope, mode: 'target', expectedValue: 10000.08, targetValue: 10000, description: 'Centavos' });
    assert.equal(result.adjustmentValue, -0.08);
    assert.equal(result.correctedValue, 10000);
    assert.equal(JSON.stringify(rows[0]), original);
    assert.deepEqual(transactionOptions, { isolationLevel: 'Serializable' });
    assert.match(result.periodText, /Janeiro\/2026 · Pian/);
    assert.match(result.periodText, /10\.000,08 → R\$ 10\.000,00 \(-0,08\)/);
    assert.equal(rows.at(-1).supplierCode, 'AJUSTE');
    const summary = await dataService.getSalesData();
    assert.equal(summary.samuel.total.jan, 10050);
    assert.equal(summary.samuel.pian.jan, 10000);
    const detail = await dataService.getFabricasDetails();
    assert.equal(detail.samuel['Ajuste manual · Pian'].jan, -0.08);
    assert.equal(Object.values(detail.samuel).reduce((sum, supplier) => sum + supplier.jan, 0), summary.samuel.total.jan);
    const weekly = await dataService.getWeeklySupplierData('samuel', 1);
    assert.equal(weekly.grandTotal.total, summary.samuel.total.jan);
    assert.equal(weekly.grandTotal.weekValues[0], 10050.08);
    assert.equal(weekly.grandTotal.adjustmentValue, -0.08);
    assert.deepEqual(weekly.suppliers.find(s => s.adjustmentValue).weekValues, [0, 0, 0, 0]);
});

test('stale or repeated corrections are rejected without creating another record', async () => {
    const input = { ...scope, mode: 'target', expectedValue: 10000.08, targetValue: 10000 };
    await service.saveAdjustment(input);
    await assert.rejects(service.saveAdjustment(input), error => error.status === 409);
    assert.equal(records.length, 1);
    await assert.rejects(service.saveAdjustment({ ...input, expectedValue: 10000 }), error => error.status === 400);
    assert.equal(records.length, 1);
});

test('signed differences support subtracting, zero final balance and decimal arithmetic', async () => {
    await service.saveAdjustment({ ...scope, value: -10000.08, expectedValue: 10000.08 });
    assert.equal((await service.getAdjustmentBalance(scope)).currentValue, 0);
    await service.saveAdjustment({ ...scope, value: 0.1, expectedValue: 0 });
    await service.saveAdjustment({ ...scope, value: 0.2, expectedValue: 0.1 });
    assert.equal((await service.getAdjustmentBalance(scope)).currentValue, 0.3);
    assert.equal((await dataService.getSalesData()).samuel.pian.jan, 0.3);
});

test('legacy adjustments use their explicit month and have a separate factory label', async () => {
    rows = [{ ...originalSale(-0.07), supplierName: 'old description', import: { type: 'adjustment', periodYear: 2026, periodMonth: 2 } }];
    const weekly = await dataService.getWeeklySupplierData('samuel', 2);
    assert.equal(weekly.grandTotal.total, -0.07);
    assert.equal(weekly.suppliers[0].name, 'Ajuste manual · Pian');
    assert.equal((await dataService.getSalesData()).samuel.pian.fev, -0.07);
});

test('invalid scopes, precision, values, no-op and descriptions are rejected before persistence', async () => {
    for (const changes of [
        { vendorKey: 'unknown' }, { factoryKey: 'total' }, { factoryKey: '__proto__' },
        { month: 0 }, { month: 13 }, { month: 1.5 }, { year: 2025 },
        { value: '' }, { value: null }, { value: true }, { value: 'abc' }, { value: Infinity },
        { value: 0.001 }, { value: 0 }, { value: 1e18 }, { mode: 'other' },
        { mode: 'target', targetValue: 100 }, { description: 'a'.repeat(201) }, { description: {} }
    ]) {
        await assert.rejects(service.saveAdjustment({ ...scope, value: 1, ...changes }), error => error.status === 400, JSON.stringify(changes));
    }
    assert.equal(records.length, 0);
});

test('HTTP returns validation and concurrency statuses without saving', async () => {
    const post = body => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await post({ ...scope, value: 0.001 })).status, 400);
    assert.equal((await post({ ...scope, value: 1, expectedValue: 3 })).status, 409);
    conflict = true;
    assert.equal((await post({ ...scope, value: 1 })).status, 409);
    assert.equal(records.length, 0);
});
