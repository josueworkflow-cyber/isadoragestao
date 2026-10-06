const { test } = require('node:test');
const assert = require('node:assert/strict');

const sales = [
    { vendorKey:'samuel',factoryKey:'pian',supplierName:'PIAN ALIMENTOS LTDA',value:10000,periodStart:new Date(2026,0,5),periodEnd:new Date(2026,0,9),import:{type:'type1',periodMonth:1,periodYear:2026} },
    { vendorKey:'samuel',factoryKey:'nutri',supplierName:'NUTRIBAUR ALIMENTOS LTDA',value:4000,periodStart:new Date(2026,0,12),periodEnd:new Date(2026,0,16),import:{type:'type1',periodMonth:1,periodYear:2026} },
    { vendorKey:'samuel',factoryKey:'pian',supplierName:'AJUSTE MANUAL',value:-500,periodStart:new Date(2026,0,5),periodEnd:new Date(2026,0,30),import:{type:'adjustment',periodMonth:2,periodYear:2026} },
    { vendorKey:'samuel',factoryKey:'pian',supplierName:'PIAN ALIMENTOS LTDA',value:999999,periodStart:new Date(2025,0,5),periodEnd:new Date(2025,0,9),import:{type:'type1',periodMonth:1,periodYear:2025} },
];
const dbPath = require.resolve('../src/services/db');
require.cache[dbPath] = { id:dbPath,filename:dbPath,loaded:true,exports:{
    supplierSale:{findMany:async options => {
        assert.equal(options.where?.import?.periodYear,2026);
        assert.equal(options.include.import,true);
        return sales.filter(sale => sale.import.periodYear === options.where.import.periodYear);
    }},
    meta:{findMany:async () => [{vendorKey:'samuel',factoryKey:'total',month:1,metaMensal:10000,metaAnual:120000}]},
} };
const service = require('../src/services/data-service');

test('sales feed respects the commercial month, signed adjustments and dashboard year', async () => {
    const data = await service.getSalesData();
    assert.equal(data.samuel.total.jan,14000);
    assert.equal(data.samuel.total.fev,-500);
    assert.equal(data.samuel.pian.jan,10000);
    assert.equal(data.samuel.pian.fev,-500);
    assert.equal(data.samuel.nutri.jan,4000);
    assert.equal(data.samuel.total.ma,120000);
});

test('supplier detail reconciles with the consolidated feed for the same year', async () => {
    const details = await service.getFabricasDetails();
    const totals = await service.getSalesData();
    for(const month of ['jan','fev']) {
        assert.equal(Object.values(details.samuel).reduce((sum,supplier)=>sum+supplier[month],0),totals.samuel.total[month]);
    }
});
