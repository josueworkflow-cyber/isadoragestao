// Local UI preview using the real adjustment and aggregation services with an in-memory database.
// All writes are disposable and never reach the application database.
const express = require('express');
const path = require('node:path');
const { getCommercialMonth } = require('../src/config/calendar');
const period = getCommercialMonth(9);
let nextId = 3;
const records = [{ id:1,type:'type1',vendorKey:'samuel',periodMonth:9,periodYear:2026,periodText:'Setembro/2026',filename:'DADOS SIMULADOS',rowsCount:2,createdAt:new Date() }];
records.push({id:2,type:'type2',vendorKey:'samuel',periodMonth:9,periodYear:2026,periodText:'Setembro/2026',filename:'pedidos-exemplo.xlsx + ultimas-compras-exemplo.xlsx',rowsCount:3,createdAt:new Date()});
const sales = [
    { factoryKey:'pian',supplierName:'PIAN ALIMENTOS LTDA',value:10000.08 },
    { factoryKey:'nutri',supplierName:'NUTRIBAUR ALIMENTOS LTDA',value:5000.5 }
].map((s,index) => ({ ...s,id:index+1,importId:1,supplierCode:String(index+100),vendorKey:'samuel',periodStart:period.weeks[0].start,periodEnd:period.weeks[0].end,import:records[0] }));
const clients = ['Cliente de exemplo A','Cliente de exemplo B','Cliente de exemplo C'].map((name,index)=>({id:index+1,importId:2,vendorKey:'samuel',clientCode:String(index+1001),clientName:name,city:'Pelotas',totalValue:1000+index*100,periodMonth:9,periodYear:2026}));
function mockTable(rows, valueField) {
    const matching = where => rows.filter(row =>
        (!where.vendorKey || row.vendorKey===where.vendorKey) &&
        (!where.importId || row.importId===where.importId) &&
        (!where.import?.periodYear || row.import.periodYear===where.import.periodYear) &&
        (!where.periodMonth || row.periodMonth===where.periodMonth) &&
        (!where.periodYear || row.periodYear===where.periodYear));
    return {
        findMany:async ({where={},skip=0,take=rows.length})=>matching(where).slice(skip,skip+take),
        count:async ({where})=>matching(where).length,
        aggregate:async ({where})=>({_sum:{[valueField]:matching(where).reduce((total,row)=>total+row[valueField],0)}}),
        groupBy:async ()=>[]
    };
}
const db = {
    supplierSale:mockTable(sales,'value'),
    clientSale:mockTable(clients,'totalValue'),
    meta:{ findMany:async () => [
        {vendorKey:'samuel',factoryKey:'total',month:1,metaMensal:10000,metaAnual:120000},
        {vendorKey:'samuel',factoryKey:'pian',month:1,metaMensal:7000,metaAnual:84000}
    ] },
    cityCoordinate:{ findMany:async () => [] },
    import:{
        findUnique:async ({where})=>records.find(record=>record.id===where.id)||null,
        count:async () => records.length,
        findMany:async (options={}) => options.where?.type === 'type2' ? [] : [...records].reverse().slice(options.skip || 0,(options.skip || 0)+(options.take || records.length)),
        create:async ({data}) => {
            const {supplierSales,...fields}=data;
            const record={id:nextId++,...fields,createdAt:new Date()};
            records.push(record);
            sales.push({...supplierSales.create,id:sales.length+1,importId:record.id,import:record});
            return record;
        }
    },
    $transaction:async callback => callback(db)
};
const dbPath = require.resolve('../src/services/db');
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
const app=express();
app.use(express.json());
app.post('/api/history/sync',(req,res)=>res.json({success:true}));
app.use('/api/data',require('../src/routes/data'));
app.use('/api/import',require('../src/routes/import'));
app.use('/api/history',require('../src/routes/history'));
app.use(express.static(path.join(__dirname,'../../frontend')));
app.listen(8771,'127.0.0.1',()=>console.log('Synthetic adjustment preview: http://127.0.0.1:8771 (Samuel / Pian / Setembro)'));
