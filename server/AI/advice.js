import express from 'express';
import { BunnyAdvisor } from '../lib/ai/budgetAnalyzer.ts';  // pune extensia .js la import
import { db } from '../firebaseAdmin.js';

const app = express();
const port = 5000;

app.get('/ai/advice', async (req, res) => {
    try {
        const userId = req.query.userId || 'user-unused-category';

        const expensesSnapshot = await db.collection('expenses').where('userId', '==', userId).get();
        const transactions = expensesSnapshot.docs.map(doc => doc.data());

        const budgetDoc = await db.collection('budgets').doc(`budget-${userId}`).get();
        const budget = budgetDoc.data();

        const advice = await BunnyAdvisor.analyzeTransactions(transactions, budget);

        res.json(advice);
    } catch (error) {
        console.error('Error in /ai/advice:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
