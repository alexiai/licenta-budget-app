const admin = require('../../firebaseAdmin').admin;

const usersToCreate = [
    {
        uid: 'user-unused-category',
        email: 'unusedcat@example.com',
        password: 'password1$',
        displayName: 'User UnusedCat',
    },
    // ... restul userilor
];

async function createUsers() {
    for (const user of usersToCreate) {
        try {
            await admin.auth().createUser(user);
            console.log(`Created user: ${user.email}`);
        } catch (error) {
            if (
                error.code === 'auth/email-already-exists' ||
                error.code === 'auth/uid-already-exists'
            ) {
                console.log(`User already exists: ${user.email}`);
            } else {
                console.error('Firebase auth error:', error);
            }
        }
    }
}

if (require.main === module) {
    createUsers().catch(console.error);
}
