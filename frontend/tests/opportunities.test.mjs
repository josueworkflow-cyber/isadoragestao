import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOpportunities,filterOpportunities,saoPauloDay } from '../js/opportunities-model.js';
import { accumulateAbc } from '../js/client-identity.js';

const day='2026-10-06';
const client=(code,n,v,cd='Pelotas')=>({code,n,v,cd,ck:cd.toUpperCase().replace(/\s/g,''),a:v>2000?'A':v>500?'B':'C'});
function fixture() {
    return {VND_LIST:[{k:'samuel',l:'Samuel',active:true},{k:'jairo',l:'Jairo',active:true},{k:'celso',l:'Celso',active:true}],
        OPPORTUNITY_COVERAGE:{year:2026,months:[{key:'jul',endDate:'2026-07-31',vendors:['samuel','jairo']},{key:'ago',endDate:'2026-08-28',vendors:['samuel','jairo','celso']},{key:'set',endDate:'2026-10-02',vendors:['samuel','jairo']},{key:'out',endDate:'2026-10-30',vendors:['samuel','jairo']}]},
        ABC_LOADED_MONTHS:['jul','ago','set','out'],ABC_JUL:{},
        ABC_AGO:{samuel:[client('R','Recuperar',5000),client('D','Queda',3000),client('A','Importante',4000,'Bagé'),client('B','Estável',2000,'Rio Grande'),client('T','Transferido',2500)],jairo:[client('G','Crescimento',1000,'Jaguarão')],celso:[client('P','Sem relatório atual',5000)]},
        ABC_SET:{samuel:[client('D','Queda',1800),client('A','Importante Ltda',4000,'Bagé'),client('B','Estável',2000,'Rio Grande'),client('N','Novo cliente',1200,'Bagé')],jairo:[client('G','Crescimento',20000,'Jaguarão'),client('T','Transferido',2500)]},ABC_OUT:{samuel:[client('R','Recuperar',90000)]},
    };
}
test('compares the last closed imported month with the immediately previous month',()=>{
    const data=fixture();const original=JSON.stringify(data);
    const model=buildOpportunities(data,{day});
    assert.equal(model.month,'set');assert.equal(model.previous,'ago');assert.equal(model.status,'ready');
    assert.deepEqual(model.groups.recover.map(row=>row.code),['R']);
    assert.deepEqual(model.groups.drop.map(row=>row.code),['D']);
    assert.equal(model.groups.drop[0].dropPercent,40);
    assert.deepEqual(new Set(model.groups.important.map(row=>row.code)),new Set(['R','D','A','T']));
    assert.equal(model.groups.important.find(row=>row.code==='A').reduction,0);
    assert.ok(model.groups.important.find(row=>row.code==='A').shareDrop>20);
    assert.equal(model.groups.regions.length,1);
    assert.equal(model.groups.regions[0].city,'Pelotas');
    assert.equal(model.groups.regions[0].previous,10500);assert.equal(model.groups.regions[0].current,4300);
    assert.deepEqual(model.groups.regions[0].vendors,['jairo','samuel']);
    assert.equal(JSON.stringify(data),original);
});
test('missing reports never become zero sales or a recovery opportunity',()=>{
    const data=fixture();let model=buildOpportunities(data,{day});
    assert.equal(model.groups.recover.some(row=>row.code==='P'),false);
    assert.deepEqual(model.eligibleVendors,['samuel','jairo']);
    assert.equal(model.excludedVendors.find(row=>row.vendor==='celso').missingCurrent,true);
    data.OPPORTUNITY_COVERAGE.months.find(month=>month.key==='ago').vendors=[];
    model=buildOpportunities(data,{day});assert.equal(model.status,'missing-imports');
    assert.equal(model.groups.recover.length,0);
    // July is loaded but cannot silently replace August.
    assert.equal(model.previous,'ago');
});
test('stable client codes survive spelling changes and vendor transfers',()=>{
    const model=buildOpportunities(fixture(),{day});
    assert.equal(model.groups.recover.some(row=>row.code==='A' || row.code==='T'),false);
    assert.equal(model.groups.drop.some(row=>row.code==='A' || row.code==='T'),false);
    assert.equal(model.groups.important.find(row=>row.code==='A').name,'Importante Ltda');
    const data=fixture();data.ABC_AGO.samuel.push(client('X1','Mesmo nome',3000),client('X2','Mesmo nome',5000));
    data.ABC_SET.samuel.push(client('X2','Mesmo nome',5000));
    assert.deepEqual(buildOpportunities(data,{day}).groups.recover.filter(row=>row.name==='Mesmo nome').map(row=>row.code),['X1']);
});
test('a customer appearing under a vendor with incomplete reports is withheld',()=>{
    const data=fixture();data.ABC_SET.celso=[client('R','Recuperar',5000)];
    const model=buildOpportunities(data,{day});
    assert.equal(model.groups.recover.some(row=>row.code==='R'),false);assert.equal(model.skippedClients,1);
});
test('a fully imported empty month is different from a missing or failed month',()=>{
    const data=fixture();data.ABC_SET={};
    let model=buildOpportunities(data,{day});assert.equal(model.status,'ready');assert.equal(model.groups.recover.length,6);
    data.ABC_LOADED_MONTHS=['jul','ago','out'];
    model=buildOpportunities(data,{day});assert.equal(model.status,'data-unavailable');assert.equal(model.groups.recover.length,0);
    data.OPPORTUNITY_COVERAGE=null;assert.equal(buildOpportunities(data,{day}).status,'coverage-unavailable');
});
test('commercial month boundaries use Sao Paulo and exclude open months',()=>{
    assert.equal(saoPauloDay(new Date('2026-10-03T01:00:00Z')),'2026-10-02');
    assert.equal(buildOpportunities(fixture(),{day:'2026-10-02'}).month,'ago');
    assert.equal(buildOpportunities(fixture(),{day:'2026-10-03'}).month,'set');
    assert.equal(buildOpportunities(fixture(),{day,month:'out'}).status,'no-complete-month');
    const data=fixture();data.OPPORTUNITY_COVERAGE.months=[{key:'jan',endDate:'2026-01-30',vendors:['samuel']}];data.ABC_JAN={};
    assert.equal(buildOpportunities(data,{day}).status,'no-previous-month');
});
test('configurable threshold is inclusive and new clients are not losses',()=>{
    const data=fixture();data.ABC_SET.samuel.find(row=>row.code==='D').v=2400;
    assert.equal(buildOpportunities(data,{day}).groups.drop.find(row=>row.code==='D').dropPercent,20);
    assert.equal(buildOpportunities(data,{day,threshold:30}).groups.drop.some(row=>row.code==='D'),false);
    assert.equal(buildOpportunities(data,{day}).groups.recover.some(row=>row.code==='N'),false);
    assert.equal(buildOpportunities(data,{day}).groups.drop.some(row=>row.code==='N'),false);
});

test('negative net sales are preserved and recovery is distinct from a positive decline',()=>{
    const data=fixture();data.ABC_SET.samuel.push(client('R','Recuperar',-500));
    const model=buildOpportunities(data,{day});
    const recovered=model.groups.recover.find(row=>row.code==='R');
    assert.equal(recovered.current,-500);assert.equal(recovered.reduction,5500);
    assert.ok(Math.abs(recovered.dropPercent-110)<1e-8);
    assert.equal(model.groups.drop.some(row=>row.code==='R'),false);
    assert.equal(model.groups.important.some(row=>row.code==='R'),true);
});

test('two curve B vendor relationships do not automatically make a customer curve A',()=>{
    const data=fixture();
    data.ABC_AGO.samuel.push(client('BB','Duas carteiras B',1500));
    data.ABC_AGO.jairo.push(client('BB','Duas carteiras B',1500));
    const model=buildOpportunities(data,{day});
    assert.equal(model.groups.recover.find(row=>row.code==='BB').previous,3000);
    assert.equal(model.groups.important.some(row=>row.code==='BB'),false);
});
test('filters retain priority order, accept accents and match codes and responsible vendors',()=>{
    const rows=buildOpportunities(fixture(),{day}).groups.important;
    assert.equal(filterOpportunities(rows,{search:'Importante'}).length,1);
    assert.equal(filterOpportunities(rows,{search:'bage'})[0].code,'A');
    assert.equal(filterOpportunities(rows,{vendor:'jairo'})[0].code,'T');
    assert.equal(filterOpportunities(rows,{city:'BAGE'})[0].code,'A');
    assert.equal(filterOpportunities(rows,{vendor:'celso'}).length,0);
});
test('ABC accumulation preserves monthly data, same-name codes, legacy cities and curve boundaries',()=>{
    const sources=[{samuel:[client('1','Mesmo',2000),client('2','Mesmo',500),client('','Antigo',300,'Bagé'),client('','Antigo',200,'Pelotas')]},{samuel:[client('1','Nome atualizado',100),client('2','Mesmo',1)]}];
    const original=JSON.stringify(sources);const accum=accumulateAbc(sources);
    assert.equal(accum.samuel.length,4);
    assert.equal(accum.samuel.find(row=>row.code==='1').v,2100);assert.equal(accum.samuel.find(row=>row.code==='1').a,'A');
    assert.equal(accum.samuel.find(row=>row.code==='2').a,'B');
    assert.equal(accum.samuel.filter(row=>row.n==='Antigo').length,2);
    assert.equal(JSON.stringify(sources),original);
});
