const { test,before,after }=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const dbPath=require.resolve('../src/services/db');
const records=[
 {id:1,vendorKey:'samuel',clientCode:'001',clientName:'Pet antigo',city:'Pelotas',totalValue:1500,periodMonth:8,periodYear:2026},
 {id:2,vendorKey:'samuel',clientCode:'001',clientName:'Pet atualizado',city:'Pelotas',totalValue:1000,periodMonth:8,periodYear:2026},
 {id:3,vendorKey:'samuel',clientCode:'002',clientName:'Pet atualizado',city:'Bagé',totalValue:500,periodMonth:8,periodYear:2026},
 {id:4,vendorKey:'samuel',clientCode:'001',clientName:'Ano passado',city:'Pelotas',totalValue:99999,periodMonth:8,periodYear:2025},
];
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{
 clientSale:{findMany:async options=>{
  assert.equal(options.where.periodYear,2026);assert.deepEqual(options.orderBy,{id:'asc'});
  return records.filter(row=>row.periodYear===options.where.periodYear && row.periodMonth===options.where.periodMonth);
 }},
 import:{findMany:async options=>{
  assert.deepEqual(options.where,{type:'type2',periodYear:2026});assert.deepEqual(options.select,{vendorKey:true,periodMonth:true});
  return [{vendorKey:'samuel',periodMonth:8},{vendorKey:'samuel',periodMonth:8},{vendorKey:'jairo',periodMonth:9},{vendorKey:'samuel',periodMonth:9}];
 }}
}};
const service=require('../src/services/data-service');
let server,url;
before(async()=>{const app=express();app.use('/api/data',require('../src/routes/data'));server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));url=`http://127.0.0.1:${server.address().port}/api/data`;});
after(async()=>{await new Promise(resolve=>server.close(resolve));});
test('ABC sums client/vendor/month rows before classification and returns stable customer codes',async()=>{
 const data=await service.getABCData(8);assert.equal(data.samuel.length,2);
 assert.equal(data.samuel[0].code,'001');assert.equal(data.samuel[0].v,2500);assert.equal(data.samuel[0].a,'A');assert.equal(data.samuel[0].n,'Pet atualizado');
 assert.equal(data.samuel[1].code,'002');assert.equal(data.samuel[1].v,500);assert.equal(data.samuel[1].a,'C');
});
test('coverage reports imported vendor/month pairs without duplicating reports and uses the commercial calendar',async()=>{
 const coverage=await service.getOpportunityCoverage();assert.equal(coverage.year,2026);assert.equal(coverage.months.length,12);
 assert.deepEqual(coverage.months[7].vendors,['samuel']);assert.deepEqual(coverage.months[8].vendors,['jairo','samuel']);
 assert.equal(coverage.months[8].endDate,'2026-10-02');assert.deepEqual(coverage.months[9].vendors,[]);
});
test('HTTP coverage, legacy ABC shape and invalid month validation',async()=>{
 const coverage=await fetch(`${url}/opportunity-coverage`);assert.equal(coverage.status,200);assert.equal((await coverage.json()).year,2026);
 const response=await fetch(`${url}/abc/8`);assert.equal(response.status,200);assert.equal((await response.json()).samuel[0].code,'001');
 for(const month of ['0','13','no-month']) assert.equal((await fetch(`${url}/abc/${month}`)).status,400);
});
