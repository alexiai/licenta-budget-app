import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { db, auth } from '../../../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import styles from './styles';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OverviewHeader from '@components/OverviewHeader';

export default function OverviewListScreen() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const router = useRouter();


    useEffect(() => {
        const fetchExpenses = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const q = query(
                collection(db, 'expenses'),
                where('userId', '==', user.uid),
                orderBy('date', 'asc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExpenses(data);
        };

        fetchExpenses();
    }, []);

    return (
        <View style={styles.container}>
            <OverviewHeader />
            <Text style={styles.title}>📃 Expense List</Text>

            <FlatList
                data={expenses}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.item}>
                        <Text style={styles.category}>{item.category}</Text>
                        <Text style={styles.amount}>- {item.amount} {item.currency}</Text>
                        <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                )}
            />

            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/tabs/expenses/add')}>
                <Ionicons name="add" size={28} color="#fff" />
                <Text style={styles.addBtnText}>Add Expense</Text>
            </TouchableOpacity>
        </View>
    );
}
