import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import styles from '@styles/bank';
import axios from 'axios';
import WebView from 'react-native-webview';
import { Platform, Linking } from 'react-native';
import {doc, setDoc, updateDoc} from 'firebase/firestore';
import { auth, db } from '@lib/firebase';

export default function BankConnect() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [connectUrl, setConnectUrl] = useState<string | null>(null);

    const handleConnect = async () => {
        setLoading(true);
        try {
            const response = await axios.post('http://192.168.0.1:5000/api/connect-gocardless', {
                redirect: 'http://localhost:8081/tabs/overview/list'
            });
            const url = response.data?.link;

            if (!url) throw new Error('Missing redirect URL');
            console.log('🔗 Connect URL:', url);

            if (Platform.OS === 'web') {
                window.location.href = url; // sau Linking.openURL(url);
            } else {
                setConnectUrl(url); // WebView only on mobile
            }
        } catch (err: any) {
            console.error('❌ Error connecting GoCardless:', err.response?.data || err.message);
            Alert.alert('Error', 'Failed to connect to bank.');
        } finally {
            setLoading(false);
        }
    };

    const saveBankAccountId = async (bankAccountId: string) => {
        const user = auth.currentUser;
        if (!user) return;

        await updateDoc(doc(db, 'users', user.uid), {
            bankAccountId,
            bankConnected: true,
            bankConnectedAt: new Date().toISOString(),
        });
    };

    const handleWebViewNavigationStateChange = async (navState: any) => {
        const { url } = navState;
        console.log('🌐 WebView navigation:', url);
        if (url.includes('/tabs/overview/list')) {
            setConnectUrl(null);
            const requisitionId = new URL(url).searchParams.get('ref'); // sau alta cheie, vezi cum o setezi
            if (requisitionId) {
                try {
                    const res = await axios.get(`http://192.168.0.1:5000/api/account-id?requisition_id=${requisitionId}`);
                    const accountId = res.data.accountId;
                    await saveBankAccountId(accountId);
                } catch (e) {
                    console.error('❌ Failed to fetch account ID:', e.message);
                }
            }
            router.push('/tabs/overview/list');
        }
    };

    return (
        <View style={styles.container}>
            {connectUrl && Platform.OS !== 'web' ? (
                <WebView
                    source={{ uri: connectUrl }}
                    style={{ flex: 1 }}
                    onNavigationStateChange={handleWebViewNavigationStateChange}
                    startInLoadingState
                    javaScriptEnabled
                    domStorageEnabled
                />
            ) : (
                <TouchableOpacity
                    style={[styles.connectBtn, loading && styles.connectBtnDisabled]}
                    onPress={handleConnect}
                    disabled={loading}
                >
                    <Text style={styles.connectBtnText}>
                        {loading ? 'Connecting...' : 'Connect Bank Account'}
                    </Text>
                </TouchableOpacity>
            )}

        </View>
    );
}
