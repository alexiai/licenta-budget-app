const { db, admin } = require('../../firebaseAdmin'); // adaugă admin pentru FieldValue

async function createBudget(userId) {
    const budgetId = `budget-${userId}`;
    await db.collection('budgets').doc(budgetId).set({
        id: budgetId,
        userId: userId,
        categories: [
            {
                name: 'Food & Drinks',
                subcategories: [
                    { name: 'Groceries', amount: 300 },
                    { name: 'Restaurant', amount: 150 },
                ],
            },
            {
                name: 'Housing',
                subcategories: [{ name: 'Rent', amount: 1000 }],
            },
            {
                name: 'Transport',
                subcategories: [{ name: 'Taxi', amount: 100 }],
            },
            {
                name: 'Entertainment',
                subcategories: [{ name: 'Cinema', amount: 50 }],
            },
            {
                name: 'Health',
                subcategories: [{ name: 'Medication', amount: 50 }],
            },
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return budgetId;
}

async function clearExpensesForUser(userId) {
    const snapshot = await db.collection('expenses').where('userId', '==', userId).get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
}

async function createExpensesForUser(userId, budgetId, expenses) {
    for (const expense of expenses) {
        await db.collection('expenses').add({
            ...expense,
            userId,
            budgetId,
            date: new Date(expense.date).toISOString(),
            currency: 'RON',
        });
    }
}

// ///////////////////////////////
// Caz 1: User fără cheltuieli în categoria X în ultimele 3 luni
// ///////////////////////////////
async function case1UnusedCategory() {
    const userId = 'user-unused-category';
    const budgetId = await createBudget(userId);

    await clearExpensesForUser(userId);

    const expenses = [
        {
            amount: 100,
            category: 'Food & Drinks',
            subcategory: 'Groceries',
            date: new Date().toISOString(),
            note: 'Weekly groceries',
        },
        {
            amount: 1200,
            category: 'Housing',
            subcategory: 'Rent',
            date: new Date().toISOString(),
            note: 'Monthly rent',
        },
    ];

    await createExpensesForUser(userId, budgetId, expenses);
    console.log('Caz 1 (Unused Category) creat');
}

// ///////////////////////////////
// Caz 2: User cu depășire de buget pe o categorie
// ///////////////////////////////
async function case2Overspending() {
    const userId = 'user-overspending';
    const budgetId = await createBudget(userId);

    await clearExpensesForUser(userId);

    const expenses = [
        {
            amount: 400,
            category: 'Food & Drinks',
            subcategory: 'Groceries',
            date: new Date().toISOString(),
            note: 'Expensive groceries',
        },
        {
            amount: 150,
            category: 'Food & Drinks',
            subcategory: 'Restaurant',
            date: new Date().toISOString(),
            note: 'Dinner out',
        },
        {
            amount: 1100,
            category: 'Housing',
            subcategory: 'Rent',
            date: new Date().toISOString(),
            note: 'Monthly rent',
        },
    ];

    await createExpensesForUser(userId, budgetId, expenses);
    console.log('Caz 2 (Overspending) creat');
}

// ///////////////////////////////
// Caz 3: User cu cheltuieli normale, fără anomalii și fără depășiri
// ///////////////////////////////
async function case3NormalSpending() {
    const userId = 'user-normal-spending';
    const budgetId = await createBudget(userId);

    await clearExpensesForUser(userId);

    const expenses = [
        {
            amount: 150,
            category: 'Food & Drinks',
            subcategory: 'Groceries',
            date: new Date().toISOString(),
            note: 'Groceries',
        },
        {
            amount: 1200,
            category: 'Housing',
            subcategory: 'Rent',
            date: new Date().toISOString(),
            note: 'Rent',
        },
        {
            amount: 80,
            category: 'Transport',
            subcategory: 'Taxi',
            date: new Date().toISOString(),
            note: 'Taxi ride',
        },
    ];

    await createExpensesForUser(userId, budgetId, expenses);
    console.log('Caz 3 (Normal Spending) creat');
}

// ///////////////////////////////
// Caz 4: User cu patternuri neobișnuite (anomalii)
// ///////////////////////////////
async function case4Anomaly() {
    const userId = 'user-anomaly';
    const budgetId = await createBudget(userId);

    await clearExpensesForUser(userId);

    const expenses = [
        {
            amount: 150,
            category: 'Food & Drinks',
            subcategory: 'Groceries',
            date: new Date().toISOString(),
            note: 'Groceries normal',
        },
        {
            amount: 3000,  // anomalie: foarte mare pentru categoria asta
            category: 'Food & Drinks',
            subcategory: 'Restaurant',
            date: new Date().toISOString(),
            note: 'Very expensive dinner',
        },
    ];

    await createExpensesForUser(userId, budgetId, expenses);
    console.log('Caz 4 (Anomaly) creat');
}

// ///////////////////////////////
// Caz 5: User care îndeplinește milestone-uri la quest-uri
// ///////////////////////////////
async function case5QuestMilestones() {
    const userId = 'user-quest-milestones';
    const budgetId = await createBudget(userId);

    await clearExpensesForUser(userId);

    const expenses = [
        {
            amount: 250,
            category: 'Food & Drinks',
            subcategory: 'Groceries',
            date: new Date().toISOString(),
            note: 'Groceries',
        },
        {
            amount: 140,
            category: 'Food & Drinks',
            subcategory: 'Restaurant',
            date: new Date().toISOString(),
            note: 'Restaurant',
        },
    ];

    await createExpensesForUser(userId, budgetId, expenses);
    console.log('Caz 5 (Quest Milestones) creat');
}

async function createAllCases() {
    await case1UnusedCategory();
    await case2Overspending();
    await case3NormalSpending();
    await case4Anomaly();
    await case5QuestMilestones();
}

if (require.main === module) {
    createAllCases().catch(console.error);
}
