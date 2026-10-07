const { MONTH_KEYS, getCommercialPeriodInfo } = require('../config/calendar');

const FACTORY_LABELS = { pian: 'Pian', nutri: 'Nutri', erva: 'Pantanal', mek: 'Mek', outros: 'Outros' };
const cents = value => Math.round((Number(value) + Math.sign(Number(value)) * Number.EPSILON) * 100);
const addMoney = (a, b) => (cents(a) + cents(b)) / 100;
const saleMonth = sale => sale.import?.type === 'adjustment'
    ? MONTH_KEYS[sale.import.periodMonth - 1]
    : getCommercialPeriodInfo(sale.periodStart, sale.periodEnd).monthKey;
const adjustmentLabel = factoryKey => `Ajuste manual · ${FACTORY_LABELS[factoryKey] || factoryKey}`;

module.exports = { cents, addMoney, saleMonth, FACTORY_LABELS, adjustmentLabel };
