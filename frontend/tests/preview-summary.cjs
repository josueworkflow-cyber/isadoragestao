// Local preview with synthetic data. Never connects to the application database.
const path = require('node:path');
const express = require('../../backend/node_modules/express');

async function main() {
    const scenario=process.env.CENTRAL_PREVIEW_SCENARIO || 'normal';
    const { createOpportunityFixture } = await import('./fixtures/opportunities-data.mjs');
    const data = createOpportunityFixture();
    if(scenario==='no-history') data.OPPORTUNITY_COVERAGE.months=[];
    if(scenario==='coverage-error') data.OPPORTUNITY_COVERAGE=null;
    const app = express();
    app.get('/api/data/vendors', (req, res) => res.json(data.VND_LIST));
    app.get('/api/data/sales', (req, res) => res.json(data.D));
    app.get('/api/data/coordinates', (req, res) => res.json([]));
    app.get('/api/data/fabricas', (req, res) => res.json({}));
    app.get('/api/data/opportunity-coverage', (req, res) => {
        if(scenario==='coverage-error') return res.status(503).json({error:'Simulated coverage outage'});
        res.json(data.OPPORTUNITY_COVERAGE);
    });
    app.get('/api/data/abc/:month', (req, res) => {
        if(scenario==='month-error' && Number(req.params.month)===9) return res.status(503).json({error:'Simulated monthly data outage'});
        const months=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
        res.json(data[`ABC_${months[Number(req.params.month)-1]?.toUpperCase()}`] || {});
    });
    app.get('/api/history', (req, res) => res.json({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 }));
    app.post('/api/history/sync', (req, res) => res.json({ success: true }));
    app.use(express.static(path.join(__dirname, '..')));
    const port = process.env.SUMMARY_PREVIEW_PORT || 8770;
    app.listen(port, '127.0.0.1', () => console.log(`Local synthetic preview: http://127.0.0.1:${port}`));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
