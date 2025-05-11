
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import styles from '@styles/bank';

export default function BankConnect() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const functions = getFunctions();

    const handleConnect = async () => {
        setLoading(true);
        try {
            if (!auth.currentUser) {
                Alert.alert('Error', 'You must be logged in to connect your bank account');
                return;
            }

            // Inițiem procesul de conectare la BT
            const initBTConnection = httpsCallable(functions, 'initBTConnection');
            const response = await initBTConnection();

            if (response.data?.authUrl) {
                // Deschidem pagina de autentificare BT într-o fereastră nouă
                window.open(response.data.authUrl, '_blank');

                // Creăm o cerere de conectare în Firestore
                const connectionRequest = await addDoc(collection(db, 'bankConnections'), {
                    userId: auth.currentUser.uid,
                    status: 'pending',
                    bankName: 'Banca Transilvania',
                    createdAt: new Date().toISOString()
                });

                // Actualizăm statusul utilizatorului
                await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                    bankConnected: true,
                    bankName: 'Banca Transilvania',
                    lastSync: new Date().toISOString(),
                    connectionId: connectionRequest.id
                });

                Alert.alert(
                    'Conectare Bancă',
                    'Te rugăm să completezi autentificarea în pagina BT care s-a deschis. După autentificare, tranzacțiile tale vor fi importate automat.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.replace('/tabs/overview/list')
                        }
                    ]
                );
            }

        } catch (error: any) {
            Alert.alert('Eroare', error.message || 'Nu s-a putut realiza conexiunea cu banca. Te rugăm încearcă din nou.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Conectează-ți Contul Bancar</Text>
            <Text style={styles.description}>
                Conectează-ți contul BT pentru a importa și categoriza automat tranzacțiile tale.
            </Text>
            <TouchableOpacity
                style={[styles.connectBtn, loading && styles.connectBtnDisabled]}
                onPress={handleConnect}
                disabled={loading}
            >
                <Text style={styles.connectBtnText}>
                    {loading ? 'Se conectează...' : 'Conectare la BT'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}
