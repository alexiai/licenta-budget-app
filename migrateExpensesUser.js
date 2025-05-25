// migrateExpensesUser.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // 🔐 JSON descărcat din Firebase Console

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const OLD_USER_ID = 'eslyRujGDtX77jQtqsdRVb5XK2H3';
const NEW_USER_ID = 'xJ1E0tVYMSPXo8OEC5tj0cuIRvJ2';

async function migrateUserExpenses() {
    const expensesRef = db.collection('transactions'); // sau 'expenses', după cum ai numit colecția
    const snapshot = await expensesRef.where('userId', '==', OLD_USER_ID).get();

    if (snapshot.empty) {
        console.log('❌ No expenses found for old user ID.');
        return;
    }

    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
        const docRef = expensesRef.doc(doc.id);
        batch.update(docRef, { userId: NEW_USER_ID });
    });

    await batch.commit();
    console.log(`✅ Updated ${snapshot.size} expenses to new userId.`);
}

migrateUserExpenses();
