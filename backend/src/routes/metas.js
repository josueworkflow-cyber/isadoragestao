const express = require('express');
const router = express.Router();
const prisma = require('../services/db');

router.get('/', async (req, res) => {
    try {
        const metas = await prisma.meta.findMany();
        res.json(metas);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:vendorKey/:factoryKey', async (req, res) => {
    try {
        const { vendorKey, factoryKey } = req.params;
        const { metaMensal, metaAnual } = req.body;
        
        const result = await prisma.meta.upsert({
            where: {
                vendorKey_factoryKey: { vendorKey, factoryKey }
            },
            update: {
                metaMensal: parseFloat(metaMensal),
                metaAnual: parseFloat(metaAnual)
            },
            create: {
                vendorKey,
                factoryKey,
                metaMensal: parseFloat(metaMensal),
                metaAnual: parseFloat(metaAnual)
            }
        });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
