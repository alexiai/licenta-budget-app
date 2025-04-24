import { View, Text, TextInput, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import styles from './styles';
import { Ionicons } from '@expo/vector-icons';  // Importam Ionicons pentru iconița ochi
import bg from '@assets/bg/login-bunny2.png';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        setError('');
        if (!email || !password) {
            setError('All fields are required.');
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            const user = auth.currentUser;
            if (!user) {
                setError('Authentication failed. Please try again.');
                return;
            }

            const q = query(collection(db, 'budgets'), where('userId', '==', user.uid));
            const snap = await getDocs(q);

            if (snap.empty) {
                router.replace('/tabs/budget/onboarding');
            } else {
                await AsyncStorage.setItem('selectedBudget', snap.docs[0].id);
                router.replace('/tabs/overview/list');
            }
        } catch (err: any) {
            if (err.code === 'auth/user-not-found') setError('No account found.');
            else if (err.code === 'auth/wrong-password') setError('Wrong password.');
            else setError('Login failed. Try again.');
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