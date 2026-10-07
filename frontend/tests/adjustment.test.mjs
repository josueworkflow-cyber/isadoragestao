import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAdjustmentMoney, adjustmentPreview } from '../js/adjustment-model.js';

test('currency parser handles Brazilian cents, grouped amounts and signed differences', () => {
    for (const [input, expected] of [['10.000,08',10000.08], ['10000,00',10000], ['-0,08',-0.08], ['0',0], ['1.234',1234], ['R$ 1.234,56',1234.56], ['10000.08',10000.08]]) {
        assert.equal(parseAdjustmentMoney(input), expected);
    }
    for (const input of ['', 'abc', '12,345', '1.23,45', '1e3', 'Infinity', '1,2,3', '10 reais', '1.2345', '99999999999999999999']) {
        assert.equal(parseAdjustmentMoney(input), null, input);
    }
});

test('preview shows the correction and its exact impact on vendor totals', () => {
    const balance = { currentValue: 10000.08, vendorTotal: 20000.18 };
    assert.deepEqual(adjustmentPreview(balance,'target',10000), { difference:-0.08,corrected:10000,vendorTotal:20000.1 });
    assert.deepEqual(adjustmentPreview(balance,'delta',-0.08), { difference:-0.08,corrected:10000,vendorTotal:20000.1 });
    assert.equal(adjustmentPreview(balance,'target',10000.08).difference,0);
    assert.equal(adjustmentPreview(balance,'target',0).corrected,0);
    assert.equal(adjustmentPreview(null,'target',100),null);
    assert.equal(adjustmentPreview(balance,'target',null),null);
});
