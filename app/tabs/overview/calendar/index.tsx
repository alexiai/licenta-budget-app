import { View, Text, Image, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useEffect, useState } from 'react';
import { auth, db } from '@lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import styles from '@styles/overviewCalendar';
import OverviewHeader from '@components/OverviewHeader';
import sun from '@assets/decor/sun-mini.png';
import star from '@assets/decor/star.png';
import moon from '@assets/decor/moon-mini.png';

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
        <ScrollView style={styles.container}>
            <OverviewHeader />
            <Text style={styles.title}>🗓️ Calendar</Text>
            <Calendar markingType="custom" markedDates={markedDates} />

            <View style={styles.legend}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>🌟 Legend:</Text>
                <View style={styles.legendItem}><Image source={sun} style={styles.legendIcon} /><Text style={styles.legendText}>Good Day (Low Spending)</Text></View>
                <View style={styles.legendItem}><Image source={star} style={styles.legendIcon} /><Text style={styles.legendText}>Neutral Day (Average Spending)</Text></View>
                <View style={styles.legendItem}><Image source={moon} style={styles.legendIcon} /><Text style={styles.legendText}>Dark Day (Over Budget)</Text></View>
            </View>
        </ScrollView>
    );
}
