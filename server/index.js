// server/index.js

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();

// Configure CORS
app.use(cors({
    origin: ['http://localhost:8081', 'http://localhost:19006'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

const GOCARDLESS_URL = 'https://bankaccountdata.gocardless.com/api/v2';

const staticBanks = [
    { name: 'Airwallex', id: 'AIRWALLEX_EEA_AIPTAU32' },
    { name: 'Alpha Bank', id: 'ALPHABANK_BUCUROBU' },
    { name: 'Banca Comercială Română', id: 'BANCA_COMERCIALA_ROMANA_RNCBROBUXXX' },
    { name: 'Banca Transilvania', id: 'BANCATRANSILVANIA_BTRLRO22' },
    { name: 'BRD Groupe Societe Generale', id: 'BRD_GROUPE_SOCIETE_GENERALE_RO_BRDEROBU' },
    { name: 'bunq', id: 'BUNQ_BUNQNL2A' },
    { name: 'CEC Bank', id: 'CEC_CECEROBU' },
    { name: 'Finom', id: 'FINOM_FNOMDEB2' },
    { name: 'Garanti BBVA', id: 'GARANTI_UGBIROBU' },
    { name: 'HSBCnet', id: 'HSBC_NET_HSBCIE2D' },
    { name: 'ING', id: 'ING_INGBROBU' },
    { name: 'ING Wholesale Banking', id: 'ING_WB_INGBNL2A' },
    { name: 'Libra Bank', id: 'LIBRA_BRELROBU' },
    { name: 'Lunar', id: 'LUNAR_LUNADK22' },
    { name: 'Monese', id: 'MONESE_MNEEBEB2' },
    { name: 'N26 Bank', id: 'N26_NTSBDEB1' },
    { name: 'Neteller', id: 'PAYSAFE_NETEGB21' },
    { name: 'PayPal', id: 'PAYPAL_PPLXLULL' },
    { name: 'Paysera', id: 'PAYSERA_EVIULT21XXX' },
    { name: 'Porsche Bank', id: 'PORSCHE_PORLROBU' },
    { name: 'ProCredit Bank', id: 'PROCREDIT_RO_MIROROBU' },
    { name: 'Raiffeisen Bank', id: 'RAIFFEISEN_RZBRROBU' },
    { name: 'Raiffeisen Corporate', id: 'RAIFFEISEN_CORPORATE_RZBRROBU' },
    { name: 'Revolut', id: 'REVOLUT_REVOLT21' },
    { name: 'Skrill', id: 'PAYSAFE_SKRLGB2L' },
    { name: 'Soldo', id: 'SOLDO_SFSDIE22' },
    { name: 'Stripe', id: 'STRIPE_STPUIE21' },
    { name: 'Swan', id: 'SWAN_SWNBFR22' },
    { name: 'Unicredit', id: 'UNICREDIT_BACXROBU' },
    { name: 'Vivid Money', id: 'VIVID_VVIDLUL2' },
    { name: 'Wise', id: 'WISE_EEA_TRWIGB22' },
];

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.get('/api/banks', (req, res) => {
    res.json(staticBanks);
});


app.post('/api/connect-gocardless', async (req, res) => {
    const { institution_id } = req.body;

    if (!institution_id) {
        return res.status(400).json({ error: 'Missing institution_id' });
    }

    try {
        // Obține token
        const tokenRes = await axios.post(`${GOCARDLESS_URL}/token/new/`, {
            secret_id: process.env.GOCARDLESS_SECRET_ID,
            secret_key: process.env.GOCARDLESS_SECRET_KEY
        });

        const accessToken = tokenRes.data.access;
        const requisitionId = `bunny-${Math.random().toString(36).substring(2, 10)}`;
        const redirectUrl = `http://localhost:8081/tabs/overview/list?ref=${requisitionId}`;

        // Creează requisition
        const requisitionRes = await axios.post(
            `${GOCARDLESS_URL}/requisitions/`,
            {
                redirect: redirectUrl,
                reference: requisitionId,
                institution_id,
                user_language: 'en'
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            }
        );

        res.json(requisitionRes.data);
    } catch (err) {
        console.error('❌ GoCardless connect error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to start bank connection' });
    }
});

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// ///////////////////////////////
// Poza Avatar AI
// ///////////////////////////////
const { createCanvas, loadImage } = require('canvas'); // npm install canvas

app.post('/api/generate-avatar', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

        const image = await loadImage(req.file.buffer);
        const canvas = createCanvas(512, 512);
        const ctx = canvas.getContext('2d');

        // Fundal bej
        ctx.fillStyle = '#FFE8B0';
        ctx.fillRect(0, 0, 512, 512);

        // Desenăm poza userului într-un cerc
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 170, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(image, 86, 86, 340, 340);
        ctx.restore();

        // Contur portocaliu
        ctx.beginPath();
        ctx.arc(256, 256, 170, 0, Math.PI * 2);
        ctx.strokeStyle = '#D45920';
        ctx.lineWidth = 6;
        ctx.stroke();

        // Adaugă urechi stilizate și obraji roz
        ctx.fillStyle = '#fcd5d5';
        ctx.beginPath(); ctx.arc(180, 220, 15, 0, Math.PI * 2); ctx.fill(); // obraz stânga
        ctx.beginPath(); ctx.arc(330, 220, 15, 0, Math.PI * 2); ctx.fill(); // obraz dreapta

        const buffer = canvas.toDataURL(); // base64
        res.json({ image: buffer });
    } catch (err) {
        console.error('❌ Avatar generation error:', err);
        res.status(500).json({ error: 'Failed to generate bunny avatar' });
    }
});

// OCR proxy endpoint with improved error handling
app.post('/api/ocr', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ 
                error: 'Invalid file type. Please upload a JPEG or PNG image.' 
            });
        }

        // Create form data for Asprise API
        const formData = new FormData();
        formData.append('api_key', 'TEST'); // Replace with your API key in production
        formData.append('recognizer', 'auto');
        formData.append('ref_no', 'ocr_proxy_' + Date.now());
        
        // Use the buffer directly
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'receipt.jpg',
            contentType: req.file.mimetype
        });

        // Forward to Asprise API with timeout
        const response = await axios.post(
            'https://ocr.asprise.com/api/v1/receipt',
            formData,
            {
                headers: {
                    ...formData.getHeaders()
                },
                timeout: 30000 // 30 second timeout
            }
        );

        // Validate response data
        if (!response.data || !response.data.receipts) {
            throw new Error('Invalid response from OCR service');
        }

        res.json(response.data);
    } catch (error) {
        console.error('OCR proxy error:', error);
        
        // Send appropriate error response
        if (error.code === 'ECONNABORTED') {
            res.status(504).json({
                error: 'OCR service timeout',
                details: 'The request took too long to process'
            });
        } else if (error.response) {
            res.status(error.response.status || 500).json({
                error: 'OCR service error',
                details: error.response.data || error.message
            });
        } else {
            res.status(500).json({
                error: 'Internal server error',
                details: error.message
            });
        }
    }
});

const PORT = process.env.PORT || 5000;

// Keep the server alive
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    server.close(() => {
        console.log('Server closed. Exiting process.');
        process.exit(0);
    });
});
