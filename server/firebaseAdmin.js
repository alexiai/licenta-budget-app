import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import adminPkg from 'firebase-admin';

// pentru a avea dirname în ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, './licenta-cf752-firebase-adminsdk-fbsvc-93067617b3.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const admin = adminPkg;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

export { admin, db };
