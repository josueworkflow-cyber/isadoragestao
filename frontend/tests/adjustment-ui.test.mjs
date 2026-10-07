import { test } from 'node:test';
import assert from 'node:assert/strict';

test('form loads current balance, prevents double submit and requires reload after conflict', async () => {
    const elements = new Map();
    const el = id => {
        if (!elements.has(id)) elements.set(id, { value:'',textContent:'',style:{},disabled:false });
        return elements.get(id);
    };
    const previous = { window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch };
    globalThis.window = {};
    globalThis.document = { getElementById: el };
    const scope = { vendorKey:'samuel',factoryKey:'pian',month:1,year:2026 };
    const balance = { ...scope,currentValue:10000.08,vendorTotal:20000.18,adjustmentValue:0 };
    let postCount = 0, payload, resolvePost;
    globalThis.fetch = async (url, options = {}) => {
        if (options.method === 'POST') {
            postCount++;
            payload = JSON.parse(options.body);
            return new Promise(resolve => { resolvePost = resolve; });
        }
        assert.match(url,/vendorKey=samuel/);
        return { ok:true,json:async () => balance };
    };
    try {
        await import('../js/import-manager.js');
        el('adj-vendor').value='samuel';
        el('adj-factory').value='pian';
        el('adj-month').value='1';
        el('adj-mode').value='target';
        await window.refreshAdjustmentBalance();
        assert.equal(el('adj-value').value,'10.000,08');
        assert.equal(el('adj-save').disabled,true);
        el('adj-value').value='10.000,00';
        window.updateAdjustmentPreview();
        assert.match(el('adj-difference').textContent, /0,08/);
        assert.equal(el('adj-save').disabled,false);
        const pending=window.submitAdjustment();
        await window.submitAdjustment();
        assert.equal(postCount,1);
        assert.equal(el('adj-controls').disabled,true);
        assert.equal(el('adj-save').disabled,true);
        assert.deepEqual(payload,{...scope,mode:'target',expectedValue:10000.08,targetValue:10000,description:''});
        resolvePost({ ok:false,status:409,json:async () => ({error:'O faturamento mudou.'}) });
        await pending;
        assert.equal(el('adj-controls').disabled,false);
        assert.equal(el('adj-save').disabled,true);
        assert.match(el('adj-status').textContent,/O faturamento mudou/);
        await window.submitAdjustment();
        assert.equal(postCount,1);
        balance.currentValue=10000;
        await window.refreshAdjustmentBalance();
        assert.equal(el('adj-value').value,'10.000,00');
        assert.equal(el('adj-save').disabled,true);
    } finally {
        Object.assign(globalThis,previous);
    }
});
