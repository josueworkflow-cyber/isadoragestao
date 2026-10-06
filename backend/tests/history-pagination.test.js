const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Exercise the HTTP contract without accessing the application database.
let records;
const calls = [];
function matches(record, where = {}) {
    return (!where.type || record.type === where.type) && (!where.OR || where.OR.some(condition => {
        const [field, filter] = Object.entries(condition)[0];
        return record[field].toLowerCase().includes(filter.contains.toLowerCase());
    }));
}
const dbPath = require.resolve('../src/services/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
    import: {
        count: async ({ where }) => records.filter(record => matches(record, where)).length,
        findMany: async (options) => {
            calls.push(options);
            const sorted = records.filter(record => matches(record, options.where))
                .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
            return sorted.slice(options.skip || 0, options.take === undefined ? undefined : (options.skip || 0) + options.take);
        },
        delete: async ({ where }) => {
            const record = records.find(record => record.id === where.id);
            records = records.filter(record => record.id !== where.id);
            return record;
        }
    }
} };

let server;
let baseUrl;
before(async () => {
    const app = express();
    app.use('/api/history', require('../src/routes/history'));
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/history`;
});
beforeEach(() => {
    calls.length = 0;
    records = Array.from({ length: 42 }, (_, index) => ({
        id: index + 1,
        createdAt: new Date('2026-09-10T12:00:00Z'),
        type: index % 2 ? 'type1' : 'adjustment',
        vendorKey: index % 2 ? 'samuel' : 'celso',
        periodText: index === 39 ? 'Semana especial' : 'Setembro 2026',
        filename: index === 39 ? 'arquivo-especial.xlsx' : 'relatorio.xlsx',
        rowsCount: index + 1
    }));
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
async function page(query = 'page=1') {
    const response = await fetch(`${baseUrl}?${query}`);
    assert.equal(response.status, 200);
    return response.json();
}

test('limits each response, orders equal timestamps consistently, and has no overlap', async () => {
    const first = await page();
    const second = await page('page=2');
    assert.equal(first.total, 42);
    assert.equal(first.totalPages, 5);
    assert.deepEqual(first.items.map(item => item.id), [42, 41, 40, 39, 38, 37, 36, 35, 34, 33]);
    assert.deepEqual(second.items.map(item => item.id), [32, 31, 30, 29, 28, 27, 26, 25, 24, 23]);
    assert.ok(calls.every(call => call.take === 10));
    assert.deepEqual(calls[0].orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
});

test('searches across the entire history and combines search with the type filter', async () => {
    const result = await page('page=1&pageSize=10&search=ARQUIVO-ESPECIAL&type=type1');
    assert.equal(result.total, 1);
    assert.deepEqual(result.items.map(item => item.id), [40]);
    const vendor = await page('search=CELSO');
    assert.equal(vendor.total, 21);
    const period = await page('search=Semana');
    assert.equal(period.total, 1);
    const wrongType = await page('search=especial&type=adjustment');
    assert.equal(wrongType.total, 0);
});

test('handles the final partial page, invalid input, large pages and page size limits', async () => {
    const last = await page('page=999');
    assert.equal(last.page, 5);
    assert.deepEqual(last.items.map(item => item.id), [2, 1]);
    const invalid = await page('page=-3&pageSize=abc');
    assert.equal(invalid.page, 1);
    assert.equal(invalid.pageSize, 10);
    const capped = await page('page=Infinity&pageSize=1000000');
    assert.equal(capped.page, 1);
    assert.equal(capped.pageSize, 100);
    assert.equal((await page('page=2&pageSize=25')).items.length, 17);
});

test('returns to the last available page after deleting its only record', async () => {
    records = records.slice(0, 11);
    assert.equal((await page('page=2')).items[0].id, 1);
    const response = await fetch(`${baseUrl}/1`, { method: 'DELETE' });
    assert.equal(response.status, 200);
    const result = await page('page=2');
    assert.equal(result.page, 1);
    assert.equal(result.totalPages, 1);
    assert.equal(result.items.length, 10);
});

test('empty history has a valid page and the original unpaginated API remains compatible', async () => {
    assert.ok(Array.isArray(await (await fetch(baseUrl)).json()));
    records = [];
    const result = await page('page=2');
    assert.deepEqual(result, { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 });
});
