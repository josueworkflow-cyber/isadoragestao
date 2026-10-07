const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const records = [
    {id:1,type:'type1',vendorKey:'samuel',periodText:'Setembro / semana 1',periodMonth:9,periodWeek:1,periodYear:2026,filename:'fornecedor.xlsx',rowsCount:2},
    {id:2,type:'type2',vendorKey:'samuel',periodText:'Setembro',periodMonth:9,periodYear:2026,filename:'pedidos.xlsx + compras.xlsx',rowsCount:125},
    {id:3,type:'adjustment',vendorKey:'celso',periodText:'Correção de centavos',periodMonth:9,periodYear:2026,filename:'AJUSTE MANUAL',rowsCount:1},
    {id:4,type:'type2',vendorKey:'samuel',periodText:'Outubro',periodMonth:10,periodYear:2026,filename:'vazio.xlsx',rowsCount:0}
];
const suppliers = [
    {id:1,importId:1,supplierCode:'10',supplierName:'Fornecedor A',factoryKey:'pian',value:100.1},
    {id:2,importId:1,supplierCode:'11',supplierName:'Fornecedor B',factoryKey:'nutri',value:-0.03},
    {id:3,importId:3,supplierCode:'AJUSTE',supplierName:'Ajuste manual · Pian',factoryKey:'pian',value:-0.08},
    {id:4,importId:99,supplierName:'Outro lançamento do mesmo vendedor',value:999999}
];
const clients = Array.from({length:125},(_,i)=>({id:i+1,importId:2,clientCode:String(i+1),clientName:`Cliente ${i+1}`,city:'Pelotas',totalValue:1.1}));
clients.push({id:126,importId:99,clientName:'Outro lançamento',totalValue:999999});
const calls = [];
function table(rows, field) {
    const filtered = where => {
        assert.ok(Number.isSafeInteger(where.importId));
        calls.push(where.importId);
        return rows.filter(row=>row.importId===where.importId);
    };
    return {
        count:async ({where})=>filtered(where).length,
        aggregate:async ({where,_sum})=>{
            assert.deepEqual(_sum,{[field]:true});
            return {_sum:{[field]:filtered(where).reduce((sum,row)=>sum+row[field],0)}};
        },
        findMany:async ({where,orderBy,skip,take})=>{
            assert.deepEqual(orderBy,{id:'asc'});
            assert.ok(take<=100);
            return filtered(where).slice(skip,skip+take);
        }
    };
}
const dbPath=require.resolve('../src/services/db');
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{
    import:{findUnique:async ({where})=>records.find(record=>record.id===where.id)||null},
    supplierSale:table(suppliers,'value'),clientSale:table(clients,'totalValue')
}};
let server,url;
before(async ()=>{
    const app=express();
    app.use('/api/history',require('../src/routes/history'));
    server=app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    url=`http://127.0.0.1:${server.address().port}/api/history`;
});
after(async ()=>{await new Promise(resolve=>server.close(resolve));});
const detail=async path=>{
    const response=await fetch(`${url}/${path}`);
    assert.equal(response.status,200);
    return response.json();
};

test('supplier details return only the selected import, including signed values and metadata',async ()=>{
    const result=await detail('1');
    assert.equal(result.import.filename,'fornecedor.xlsx');
    assert.equal(result.import.periodWeek,1);
    assert.equal(result.vendorLabel,'Samuel');
    assert.equal(result.kind,'suppliers');
    assert.deepEqual(result.rows.map(row=>row.id),[1,2]);
    assert.equal(result.totalValue,100.07);
    assert.deepEqual(result.pagination,{page:1,pageSize:50,total:2,totalPages:1});
});

test('client pagination covers all rows with a full-import total on every page',async ()=>{
    const first=await detail('2');
    const second=await detail('2?page=2');
    const last=await detail('2?page=999');
    assert.equal(first.kind,'clients');
    assert.equal(first.pagination.total,125);
    assert.equal(first.rows.length,50);
    assert.equal(second.rows[0].id,51);
    assert.equal(last.rows.length,25);
    assert.equal(last.pagination.page,3);
    for(const result of [first,second,last]) {
        assert.equal(result.totalValue,137.5);
        assert.ok(result.rows.every(row=>row.importId===2));
    }
    assert.equal(new Set([...first.rows,...second.rows,...last.rows].map(row=>row.id)).size,125);
});

test('adjustments preserve the signed difference, and empty imports have valid details',async ()=>{
    const adjustment=await detail('3');
    assert.equal(adjustment.import.type,'adjustment');
    assert.equal(adjustment.totalValue,-0.08);
    assert.equal(adjustment.rows[0].factoryKey,'pian');
    const empty=await detail('4');
    assert.equal(empty.totalValue,0);
    assert.deepEqual(empty.rows,[]);
    assert.equal(empty.pagination.totalPages,1);
});

test('invalid IDs and missing imports have explicit HTTP errors; pagination is bounded',async ()=>{
    for(const id of ['0','-1','1abc','1.5','9007199254740992']) assert.equal((await fetch(`${url}/${id}`)).status,400);
    assert.equal((await fetch(`${url}/999`)).status,404);
    const invalid=await detail('2?page=-1&pageSize=abc');
    assert.equal(invalid.pagination.page,1);
    assert.equal(invalid.pagination.pageSize,50);
    const capped=await detail('2?pageSize=100000');
    assert.equal(capped.rows.length,100);
    assert.equal(capped.pagination.pageSize,100);
});
