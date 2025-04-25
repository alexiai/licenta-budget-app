import { View, Text, TextInput, TouchableOpacity, ImageBackground, Alert } from 'react-native';
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
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePassword = (pass: string) => /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/.test(pass);

    const handleSignup = async () => {
        setError('');
        if (!name || !surname || !email || !password) return setError('All fields are required.');
        if (!validateEmail(email)) return setError('Invalid email.');
        if (!validatePassword(password)) return setError('Password must be at least 8 characters with 1 number and 1 special character.');

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Create user document with additional fields
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                name,
                surname,
                email,
                createdAt: new Date().toISOString(),
                notificationsEnabled: true,  // Default settings
                appNotificationsEnabled: true
            });

            Alert.alert('Success', 'Account created successfully!');
            router.replace('/auth/login');
        } catch (err: any) {
            console.error('Signup error:', err);
            let errorMessage = 'Signup failed. Try again.';

            if (err.code === 'auth/email-already-in-use') {
                errorMessage = 'Email already in use.';
            } else if (err.code === 'auth/weak-password') {
                errorMessage = 'Password should be at least 6 characters.';
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
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
                    autoCapitalize="words"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    value={surname}
                    onChangeText={setSurname}
                    placeholderTextColor="#A47E59"
                    autoCapitalize="words"
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
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                    >
                        <Ionicons
                            name={showPassword ? "eye" : "eye-off"}
                            size={24}
                            color="#A47E59"
                        />
                    </TouchableOpacity>
                </View>

                {!!error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity
                    style={[styles.button, loading && styles.disabledButton]}
                    onPress={handleSignup}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Creating Account...' : 'SIGN UP'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.signupContainer}>
                    <Text style={styles.linkText}>Already have an account?</Text>
                    <Link href="/auth/login" style={styles.signupLink}>
                        <Text style={styles.signupLinkText}> Log in</Text>
                    </Link>
                </View>
            </View>
        </ImageBackground>
    );
}