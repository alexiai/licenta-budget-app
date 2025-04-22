import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import styles from './styles';

export default function SignupScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePassword = (pass: string) => /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/.test(pass);

    const handleSignup = async () => {
        setError('');
        if (!name || !surname || !email || !password) return setError('All fields are required.');
        if (!validateEmail(email)) return setError('Invalid email.');
        if (!validatePassword(password)) return setError('Password too weak.');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                name,
                surname,
                email,
                createdAt: new Date().toISOString()
            });
            router.replace('/auth/login');
        } catch (err: any) {
            setError('Signup failed. Try again.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign Up</Text>
            <TextInput style={styles.input} placeholder="First Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Last Name" value={surname} onChangeText={setSurname} />
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.button} onPress={handleSignup}>
                <Text style={styles.buttonText}>SIGN UP</Text>
            </TouchableOpacity>
            <Link href="/auth/login"><Text style={styles.link}>Already have an account? Log in</Text></Link>
        </View>
    );
}
