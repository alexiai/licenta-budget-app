import { View, Text, TextInput, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, doc, getDoc, runTransaction } from 'firebase/firestore';
import styles from '../../../styles/login';
import { Ionicons } from '@expo/vector-icons';  // Importam Ionicons pentru iconița ochi
import bg from '@assets/bg/login-bunny2.png';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!firebaseConfigured) {
            setError('Add the Firebase client settings to .env.local and restart Expo to log in.');
            return;
        }
        setError('');
        if (!email || !password) {
            setError('All fields are required.');
            return;
        }

        let signedIn = false;
        try {
            const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
            signedIn = true;

            const profileRef = doc(db, 'users', user.uid);
            const profile = await getDoc(profileRef);
            if (!profile.exists()) {
                await runTransaction(db, async transaction => {
                    const latest = await transaction.get(profileRef);
                    if (!latest.exists()) {
                        transaction.set(profileRef, {
                            email: user.email ?? email.trim(),
                            createdAt: new Date().toISOString(),
                            notificationsEnabled: true,
                            appNotificationsEnabled: true,
                        });
                    }
                });
            }

            const budgetsQuery = query(collection(db, 'budgets'), where('userId', '==', user.uid));
            const snap = await getDocs(budgetsQuery);
            if (snap.empty) {
                router.replace('/tabs/budget/onboarding');
            } else {
                const stored = await AsyncStorage.getItem('selectedBudget').catch(() => null);
                const budget = snap.docs.find(item => item.id === stored) ?? snap.docs[0];
                await AsyncStorage.setItem('selectedBudget', budget.id).catch(() => {});
                router.replace('/tabs/overview/list');
            }
        } catch (err: any) {
            if (signedIn) {
                setError(err.code === 'permission-denied'
                    ? 'Sign-in worked, but Firestore denied access. Check the Firestore Rules for your profile and budgets, then retry.'
                    : 'Sign-in worked, but your data could not be loaded. Check your connection and try again.');
            } else if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(err.code)) {
                setError('Email or password is incorrect.');
            } else {
                setError('Login failed. Try again.');
            }
        }
    };

    return (
        <ImageBackground source={bg} style={styles.bg} resizeMode="cover">
            <View style={styles.overlay}>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />

                <View style={styles.passwordContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color={showPassword ? "#F19953" : "#888"} />
                    </TouchableOpacity>
                </View>

                {!!error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                    <Text style={styles.buttonText}>LOG IN</Text>
                </TouchableOpacity>

                <View style={styles.signupContainer}>
                    <Text style={styles.linkText}>Don't have an account?</Text>
                    <Link href="/auth/signup">
                        <Text style={styles.signupLink}>Sign up</Text>
                    </Link>
                </View>

            </View>
        </ImageBackground>
    );
}