const prisma = require('./db');
const { vendors } = require('../config/vendors');
const { getCommercialMonth, MONTH_KEYS } = require('../config/calendar');
const { cents, saleMonth, FACTORY_LABELS, adjustmentLabel } = require('./sales-money');

function fail(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    throw error;
}

function validateScope(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Dados do ajuste inválidos.');
    let { vendorKey, factoryKey, month, year = 2026 } = input;
    if (!vendors.some(v => v.k === vendorKey)) fail('Vendedor inválido.');
    if (!Object.hasOwn(FACTORY_LABELS, factoryKey)) fail('Fábrica inválida.');
    month = Number(month);
    year = Number(year);
    if (!Number.isInteger(month) || month < 1 || month > 12) fail('Mês inválido.');
    if (year !== 2026) fail('O painel utiliza o ano comercial de 2026.');
    return { vendorKey, factoryKey, month, year };
}

function moneyCents(value, name) {
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') fail(`${name} inválido.`);
    const number = Number(value);
    const result = cents(number);
    if (!Number.isFinite(number) || !Number.isSafeInteger(result) || Math.abs(number * 100 - result) > 0.00001) {
        fail(`${name} deve ser um valor válido com até duas casas decimais.`);
    }
    return result;
}

async function readBalance(db, scope) {
    const sales = await db.supplierSale.findMany({
        where: { vendorKey: scope.vendorKey, import: { periodYear: scope.year } },
        include: { import: true }
    });
    const matching = sales.filter(s => saleMonth(s) === MONTH_KEYS[scope.month - 1]);
    const sum = rows => rows.reduce((total, s) => total + cents(s.value), 0);
    return {
        currentValue: sum(matching.filter(s => s.factoryKey === scope.factoryKey)) / 100,
        vendorTotal: sum(matching) / 100,
        adjustmentValue: sum(matching.filter(s => s.factoryKey === scope.factoryKey && s.import.type === 'adjustment')) / 100
    };
}

async function getAdjustmentBalance(input) {
    const scope = validateScope(input);
    return { ...scope, ...await readBalance(prisma, scope) };
}

async function saveAdjustment(input) {
    const scope = validateScope(input);
    const mode = input.mode || 'delta'; // Preserve existing API clients that send a signed difference.
    if (!['delta', 'target'].includes(mode)) fail('Forma de ajuste inválida.');
    const requested = moneyCents(mode === 'target' ? input.targetValue : input.value, 'Valor');
    const expected = input.expectedValue === undefined ? null : moneyCents(input.expectedValue, 'Valor atual');
    if (mode === 'target' && expected === null) fail('Carregue o valor atual antes de corrigir.');
    if (input.description !== undefined && typeof input.description !== 'string') fail('Descrição inválida.');
    const description = (input.description || '').trim();
    if (description.length > 200) fail('A descrição deve ter até 200 caracteres.');
    try {
        return await prisma.$transaction(async tx => {
            const balance = await readBalance(tx, scope);
            const current = cents(balance.currentValue);
            if (expected !== null && current !== expected) fail('O faturamento mudou. Confira o valor atualizado antes de salvar novamente.', 409);
            const difference = mode === 'target' ? requested - current : requested;
            const corrected = current + difference;
            if (!difference) fail('O valor informado não altera o faturamento.');
            if (!Number.isSafeInteger(corrected) || !Number.isSafeInteger(difference)) fail('Valor corrigido fora do limite permitido.');
            const period = getCommercialMonth(scope.month);
            const format = value => (value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const record = await tx.import.create({ data: {
                type: 'adjustment',
                vendorKey: scope.vendorKey,
                periodMonth: scope.month,
                periodYear: scope.year,
                periodText: `${period.name}/${scope.year} · ${FACTORY_LABELS[scope.factoryKey]} · R$ ${format(current)} → R$ ${format(corrected)} (${difference > 0 ? '+' : ''}${format(difference)})${description ? ' · ' + description : ''}`,
                filename: 'AJUSTE MANUAL',
                rowsCount: 1,
                supplierSales: { create: {
                    vendorKey: scope.vendorKey,
                    supplierCode: 'AJUSTE',
                    supplierName: adjustmentLabel(scope.factoryKey),
                    factoryKey: scope.factoryKey,
                    value: difference / 100,
                    periodStart: period.start,
                    periodEnd: period.end
                } }
            } });
            return { ...record, previousValue: current / 100, correctedValue: corrected / 100, adjustmentValue: difference / 100 };
        }, { isolationLevel: 'Serializable' });
    } catch (error) {
        if (error.code === 'P2034') fail('Outro lançamento foi salvo ao mesmo tempo. Confira o valor atualizado e tente novamente.', 409);
        throw error;
    }
}

module.exports = { getAdjustmentBalance, saveAdjustment };
