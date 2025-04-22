// === File: app/overview/calendar/index.tsx ===
import { View, Text, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useEffect, useState } from 'react';
import { auth, db } from '../../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import styles from './styles';
import OverviewHeader from '@components/OverviewHeader';

export default function CalendarOverview() {
    const [markedDates, setMarkedDates] = useState<any>({});

    useEffect(() => {
        const fetchExpenses = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
            const snapshot = await getDocs(q);
            const expenses = snapshot.docs.map(doc => doc.data());

            const map: any = {};

            expenses.forEach((e: any) => {
                const day = e.date.split('T')[0];
                map[day] = {
                    marked: true,
                    customStyles: {
                        container: {
                            backgroundColor:
                                e.amount < 100 ? '#a3f7b5' : e.amount < 200 ? '#ffe066' : '#f94144',
                        },
                        text: { color: '#000' },
                    },
                };
            });
            setMarkedDates(map);
        };
        fetchExpenses();
    }, []);

    return (
        <View style={styles.container}>
            <OverviewHeader />
            <Text style={styles.title}>📅 Calendar View</Text>
            <Calendar markingType="custom" markedDates={markedDates} />
        </View>
    );
}
