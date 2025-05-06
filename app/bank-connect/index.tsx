
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import styles from '@styles/bank';

export default function BankConnect() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleConnect = async () => {
        setLoading(true);
        try {
            if (!auth.currentUser) {
                Alert.alert('Error', 'You must be logged in to connect your bank account');
                return;
            }

            // Aici vom implementa logica pentru BT
            Alert.alert(
                'Bank Connection',
                'To connect your BT account, you will need to:\n\n1. Log into your BT account\n2. Go to Settings\n3. Enable API access\n4. Generate an API key\n\nThis feature will be available soon.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back()
                    }
                ]
            );

            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                bankConnected: true,
                bankName: 'Banca Transilvania',
                lastSync: new Date().toISOString()
            });

        } catch (error) {
            Alert.alert('Error', 'Could not connect to bank. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Connect your Bank Account</Text>
            <Text style={styles.description}>
                Connect your Banca Transilvania account to automatically import and categorize your transactions.
            </Text>
            <TouchableOpacity
                style={[styles.connectBtn, loading && styles.connectBtnDisabled]}
                onPress={handleConnect}
                disabled={loading}
            >
                <Text style={styles.connectBtnText}>
                    {loading ? 'Connecting...' : 'Connect to BT'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}
