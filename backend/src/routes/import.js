const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseType1 } = require('../parsers/type1-parser');
const { parseType2 } = require('../parsers/type2-parser');
const importService = require('../services/import-service');

const upload = multer({ storage: multer.memoryStorage() });

// --- TIPO 1 ---

// Parse Excel and return preview
router.post('/type1/parse', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        const result = parseType1(req.file.buffer);
        res.json(result);
    } catch (err) {
        console.error('Erro ao processar Tipo 1:', err);
        res.status(500).json({ error: err.message });
    }
});

// Confirm and save to DB
router.post('/type1/confirm', async (req, res) => {
    try {
        const result = await importService.saveType1Import(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TIPO 2 ---

// Parse 2 files and return combined preview
router.post('/type2/parse', upload.fields([{ name: 'fileA', maxCount: 1 }, { name: 'fileB', maxCount: 1 }]), (req, res) => {
    try {
        const fileA = req.files['fileA'] ? req.files['fileA'][0] : null;
        const fileB = req.files['fileB'] ? req.files['fileB'][0] : null;

        if (!fileA || !fileB) return res.status(400).json({ error: 'Envie ambas as planilhas (A e B).' });

        const result = parseType2(fileA.buffer, fileB.buffer);
        res.json(result);
    } catch (err) {
        console.error('Erro ao processar Tipo 2:', err);
        res.status(500).json({ error: err.message });
    }
});

// Confirm and save to DB
router.post('/type2/confirm', async (req, res) => {
    try {
        const result = await importService.saveType2Import(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AJUSTE MANUAL ---

router.post('/adjustment', async (req, res) => {
    try {
        const result = await importService.saveAdjustment(req.body);
        res.json(result);
    } catch (err) {
        console.error('Erro ao salvar ajuste manual:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
