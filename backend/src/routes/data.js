const express = require('express');
const router = express.Router();
const dataService = require('../services/data-service');

router.get('/sales', async (req, res) => {
    try {
        const data = await dataService.getSalesData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/vendors', async (req, res) => {
    try {
        const data = await dataService.getVendorsList();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/fabricas', async (req, res) => {
    try {
        const data = await dataService.getFabricasDetails();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/abc/:month', async (req, res) => {
    try {
        const monthNum = parseInt(req.params.month);
        const data = await dataService.getABCData(monthNum);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/coordinates', async (req, res) => {
    try {
        const data = await dataService.getCoordinates();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/weekly-report', async (req, res) => {
    try {
        const { vendor, month } = req.query;
        if (!vendor || !month) {
            return res.status(400).json({ error: 'vendor and month are required' });
        }
        const data = await dataService.getWeeklySupplierData(vendor, parseInt(month));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/metas', async (req, res) => {
    try {
        const { vendorKey, factoryKey, month, metaMensal, metaAnual } = req.body;
        const result = await dataService.saveMeta(vendorKey, factoryKey, month, metaMensal, metaAnual);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
