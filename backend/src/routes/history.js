const express = require('express');
const router = express.Router();
const importService = require('../services/import-service');

router.get('/', async (req, res) => {
    try {
        const paginated = ['page', 'pageSize', 'search', 'type'].some(key => key in req.query);
        const imports = paginated
            ? await importService.listImportsPage(req.query)
            : await importService.listImports();
        res.json(imports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { vendorKey } = req.body;
        const result = await importService.updateImportVendor(req.params.id, vendorKey);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await importService.deleteImport(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/sync', async (req, res) => {
    try {
        const dataService = require('../services/data-service');
        await dataService.syncExistingImports();
        res.json({ success: true, message: 'Importações sincronizadas com sucesso com o calendário comercial oficial.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
