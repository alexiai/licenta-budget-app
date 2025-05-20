// index.js (nou)

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

console.log('🧪 GOCARDLESS_SECRET_ID:', process.env.GOCARDLESS_SECRET_ID);
console.log('🧪 GOCARDLESS_SECRET_KEY:', process.env.GOCARDLESS_SECRET_KEY ? '✅ exists' : '❌ missing');

const app = express();
app.use(cors());
app.use(express.json());

const FIREFLY_BASE_URL = 'http://localhost'; // docker host rulează pe port 80
const TOKEN = process.env.FIREFLY_TOKEN;     // vezi .env

const fireflyClient = axios.create({
    baseURL: `${FIREFLY_BASE_URL}/api/v1`,
    headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/accounts', async (req, res) => {
    console.log('📥 [GET] /api/accounts endpoint HIT');
    try {
        const response = await fireflyClient.get('/accounts');
        console.log('✅ Firefly API response received.');
        res.json(response.data);
    } catch (error) {
        console.error('❌ Error fetching accounts:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});
app.get('/api/account-id', async (req, res) => {
    const { requisition_id } = req.query;
    if (!requisition_id) {
        return res.status(400).json({ error: 'Missing requisition_id' });
    }

    try {
        // 1. Obține token
        const tokenRes = await axios.post(
            'https://bankaccountdata.gocardless.com/api/v2/token/new/',
            {
                secret_id: process.env.GOCARDLESS_SECRET_ID,
                secret_key: process.env.GOCARDLESS_SECRET_KEY
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );
        const accessToken = tokenRes.data.access;

        // 2. Obține detalii despre requisition
        const requisitionRes = await axios.get(
            `https://bankaccountdata.gocardless.com/api/v2/requisitions/${requisition_id}/`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        const accountId = requisitionRes.data.accounts?.[0];
        console.log('✅ Account ID:', accountId);
        res.json({ accountId });

    } catch (error) {
        console.error('❌ Error getting account ID:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to get account ID' });
    }
});

app.post('/api/connect-gocardless', async (req, res) => {
    console.log('📥 [POST] /api/connect-gocardless endpoint HIT');
    try {
        // 1. Obține token
        const tokenRes = await axios.post(
            'https://bankaccountdata.gocardless.com/api/v2/token/new/',
            {
                secret_id: process.env.GOCARDLESS_SECRET_ID,
                secret_key: process.env.GOCARDLESS_SECRET_KEY
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        const accessToken = tokenRes.data.access;

        // ✅ 2. Generează ID unic și redirect URL
        const requisitionId = `bunny-${Math.random().toString(36).substring(2, 10)}`;
        const redirectUrl = `http://localhost:8081/tabs/overview/list?ref=${requisitionId}`;

        // 3. Creează requisition
        const requisitionRes = await axios.post(
            'https://bankaccountdata.gocardless.com/api/v2/requisitions/',
            {
                redirect: redirectUrl,
                reference: requisitionId,
                institution_id: 'BANCATRANSILVANIA_BTRLRO22',
                user_language: 'en'
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        console.log('✅ Requisition created:', requisitionRes.data);
        res.json(requisitionRes.data);
    } catch (err) {
        console.error('❌ GoCardless connect error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to start bank connection' });
    }
});


app.get('/api/transactions', async (req, res) => {
    try {
        const response = await fireflyClient.get('/transactions');
        res.json(response.data);
    } catch (error) {
        console.error('🔥 Error fetching transactions:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
