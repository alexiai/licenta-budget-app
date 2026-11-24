/*import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// Dacă folosești deja firebase/app și db exportat:
import { db } from './lib/firebase'; // adaptat la structura ta

async function updateExpenses() {
    const expensesRef = collection(db, 'expenses');
    const snapshot = await getDocs(expensesRef);

    const updates = snapshot.docs.filter(doc => {
        const data = doc.data();
        return !data.note && data.subcategory; // fără note dar cu subcategorie
    });

    console.log(`Found ${updates.length} expenses to update.`);

    for (const docSnap of updates) {
        const data = docSnap.data();
        const ref = doc(db, 'expenses', docSnap.id);
        await updateDoc(ref, {
            note: data.subcategory,
        });
        console.log(`Updated expense ${docSnap.id} → note: ${data.subcategory}`);
    }

    console.log('✅ Done!');
}

updateExpenses().catch(console.error);
*/