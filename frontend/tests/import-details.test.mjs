import { test } from 'node:test';
import assert from 'node:assert/strict';

test('detail modal renders only selected rows safely, paginates and ignores closed or stale requests',async ()=>{
    const previous={document:globalThis.document,fetch:globalThis.fetch};
    class Element {
        constructor(tag='div'){this.tag=tag;this.children=[];this.hidden=false;this.textContent='';this.open=false;this.listeners={};this.attributes={};}
        appendChild(child){this.children.push(child);}
        replaceChildren(){this.children=[];}
        addEventListener(name,listener){this.listeners[name]=listener;}
        setAttribute(name,value){this.attributes[name]=value;}
        showModal(){this.open=true;}
        close(){this.open=false;this.listeners.close?.();}
    }
    const elements=new Map();
    const el=id=>{
        if(!elements.has(id)) elements.set(id,new Element());
        return elements.get(id);
    };
    globalThis.document={getElementById:el,createElement:tag=>new Element(tag)};
    const record={id:1,type:'type2',periodMonth:9,periodYear:2026,periodText:'Setembro',createdAt:'2026-10-07T15:00:00Z',filename:'<arquivo>.xlsx'};
    const result={import:record,vendorLabel:'Samuel',kind:'clients',totalValue:80,rows:[{clientCode:'1',clientName:'<img src=x onerror=alert(1)>',city:'Pelotas',totalValue:0}],pagination:{page:1,pageSize:50,total:51,totalPages:2}};
    const requests=[];
    globalThis.fetch=async (url,options)=>{
        requests.push({url,options});
        return {ok:true,json:async ()=>result};
    };
    try {
        const {openImportDetails,closeImportDetails}=await import('../js/import-details.js');
        await openImportDetails(1);
        assert.equal(el('import-detail').open,true);
        assert.match(requests[0].url,/\/history\/1\?page=1/);
        assert.equal(el('import-detail-type').textContent,'Relatório Tipo 2');
        assert.equal(el('import-detail-total').textContent.replace(/\s/g,''),'R$80,00');
        assert.equal(el('import-detail-filename').textContent,'<arquivo>.xlsx');
        const cells=el('import-detail-rows').children[0].children;
        assert.equal(cells[1].textContent,'<img src=x onerror=alert(1)>');
        assert.equal(cells[1].children.length,0);
        assert.equal(cells[3].textContent.replace(/\s/g,''),'R$0,00');
        assert.equal(el('import-detail-next').disabled,false);
        result.pagination.page=2;
        await el('import-detail-next').onclick();
        assert.match(requests[1].url,/page=2/);
        assert.equal(el('import-detail-next').disabled,true);
        assert.equal(el('import-detail-prev').disabled,false);
        assert.equal(el('import-detail-total').textContent.replace(/\s/g,''),'R$80,00');

        // An earlier response arriving after another launch must never replace the newer details.
        let resolveOld;
        globalThis.fetch=()=>new Promise(resolve=>{resolveOld=resolve;});
        const old=openImportDetails(2);
        globalThis.fetch=async ()=>({ok:true,json:async ()=>({...result,import:{...record,id:3,type:'adjustment'},kind:'suppliers',rows:[{supplierCode:'AJUSTE',supplierName:'Correção',factoryKey:'pian',value:-0.08,periodStart:'2026-09-01T00:00:00Z',periodEnd:'2026-09-30T00:00:00Z'}],totalValue:-0.08,pagination:{page:1,pageSize:50,total:1,totalPages:1}})});
        await openImportDetails(3);
        resolveOld({ok:true,json:async ()=>result});
        await old;
        assert.equal(el('import-detail-type').textContent,'Ajuste manual');
        assert.equal(el('import-detail-total-label').textContent,'Valor do ajuste');
        assert.equal(el('import-detail-rows').children[0].children[3].textContent,'01/09/2026 – 30/09/2026');

        // Closing the dialog aborts reads and prevents a late response from re-opening it.
        let resolveClosed;
        globalThis.fetch=()=>new Promise(resolve=>{resolveClosed=resolve;});
        const pending=openImportDetails(4);
        closeImportDetails();
        resolveClosed({ok:true,json:async ()=>result});
        await pending;
        assert.equal(el('import-detail').open,false);
        assert.equal(el('import-detail-content').hidden,true);

        globalThis.fetch=async ()=>({ok:false,status:404,json:async ()=>({error:'Lançamento não encontrado.'})});
        await openImportDetails(999);
        assert.equal(el('import-detail-error').hidden,false);
        assert.equal(el('import-detail-content').hidden,true);
        assert.equal(el('import-detail-error-message').textContent,'Lançamento não encontrado.');
        closeImportDetails();
    } finally {
        Object.assign(globalThis,previous);
    }
});
