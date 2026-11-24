const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const userId = 'xJ1E0tVYMSPXo8OEC5tj0cuIRvJ2'; // Your test user UID
const userProgressRef = db.collection('userProgress').doc(userId);

async function addBadges() {
    const badges = [
        {
            id: 'first-quest',
            name: 'First Quest',
            emoji: '🏅',
            description: 'Completed your first quest!',
            requirement: 1,
            earned: true,
            earnedDate: admin.firestore.Timestamp.fromDate(new Date())
        },
        {
            id: 'quest-master',
            name: 'Quest Master',
            emoji: '🥇',
            description: 'Completed 10 quests!',
            requirement: 10,
            earned: true,
            earnedDate: admin.firestore.Timestamp.fromDate(new Date())
        }
    ];

    await userProgressRef.set({
        badges: badges
    }, { merge: true });

    console.log('Added 2 badges to user progress!');
}

addBadges().then(() => {
    console.log('Done!');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
