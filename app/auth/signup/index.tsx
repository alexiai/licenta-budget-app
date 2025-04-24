import { View, Text, TextInput, TouchableOpacity, ImageBackground } from 'react-native';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@lib/firebase';
import styles from './styles';
import { Ionicons } from '@expo/vector-icons';
import bg from '@assets/bg/signup-bunny.png';

export default function SignupScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

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
        <ImageBackground source={bg} style={styles.bg} resizeMode="cover">
            <View style={styles.overlay}>
                <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor="#A47E59"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    value={surname}
                    onChangeText={setSurname}
                    placeholderTextColor="#A47E59"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    placeholderTextColor="#A47E59"
                />
                <View style={styles.passwordContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        placeholderTextColor="#A47E59"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="#A47E59" />
                    </TouchableOpacity>
                </View>

                {!!error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity style={styles.button} onPress={handleSignup}>
                    <Text style={styles.buttonText}>SIGN UP</Text>
                </TouchableOpacity>

                <View style={styles.signupContainer}>
                    <Text style={styles.linkText}>Already have an account?</Text>
                    <Link href="/auth/login">
                        <Text style={styles.signupLink}> Log in</Text>
                    </Link>
                </View>
            </View>
        </ImageBackground>
    );
}
