import path from 'path';
import { fileURLToPath } from 'url';

// Transformă URL modul în cale fișier normală
const __filename = fileURLToPath(import.meta.url);

const { admin, db } = await import('../../firebaseAdmin.js').then(mod => mod.default || mod);

const usersToDelete = [
    'user-unused-category',
    'user-overspending',
    'user-normal-spending',
    'user-anomaly',
    'user-quest-milestones',
];

async function deleteUserData(uid) {
    try {
        await admin.auth().deleteUser(uid);
        console.log(`Deleted auth user: ${uid}`);
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            console.log(`User ${uid} not found in Auth, skipping delete.`);
        } else {
            console.error(`Error deleting auth user ${uid}:`, e);
        }
    }

    try {
        await db.collection('budgets').doc(`budget-${uid}`).delete();
        console.log(`Deleted budget for ${uid}`);
    } catch (e) {
        console.log(`No budget found or error deleting for ${uid}:`, e.message);
    }

    try {
        const expensesSnapshot = await db.collection('expenses').where('userId', '==', uid).get();
        const batch = db.batch();
        expensesSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Deleted expenses for ${uid}`);
    } catch (e) {
        console.error(`Error deleting expenses for ${uid}:`, e);
    }
}

async function main() {
    for (const uid of usersToDelete) {
        await deleteUserData(uid);
    }
    console.log('All specified users deleted.');
}

// Condiție corectă pentru a rula main doar când scriptul e rulat direct
if (path.resolve(process.argv[1]) === path.resolve(__filename)) {
    main().catch(console.error);
}
