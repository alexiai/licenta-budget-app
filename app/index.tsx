import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Index() {
    const [authChecked, setAuthChecked] = useState(false);
    const [user, setUser] = useState<User | null>(null); // 👈 tipul corect

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setAuthChecked(true);
        });
        return unsubscribe;
    }, []);

    if (!authChecked) return null;

    return <Redirect href={user ? '/tabs/overview/list' : '/welcome'} />;
}
