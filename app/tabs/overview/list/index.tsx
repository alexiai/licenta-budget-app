// overview/list/index.tsx - redesigned version
import { View, Text, FlatList, TouchableOpacity, ImageBackground, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { db, auth } from '@lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import OverviewHeader from '@components/OverviewHeader';
import bg from '@assets/bg/background3.png';
import bunnyIcon from '@assets/icons/bunnyhead.png';
import categories from '@lib/categories';
import styles from '@styles/overviewList';

export default function OverviewListScreen() {
    const [expensesByDate, setExpensesByDate] = useState<any>({});
    const [totalCarrotCoins, setTotalCarrotCoins] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const fetchExpenses = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const q = query(
                collection(db, 'expenses'),
                where('userId', '==', user.uid),
                orderBy('date', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const grouped: any = {};
            let total = 0;
            data.forEach(exp => {
                const date = new Date(exp.date).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric'
                });
                if (!grouped[date]) grouped[date] = [];
                grouped[date].push(exp);
                total += parseFloat(exp.amount || '0');
            });

            setExpensesByDate(grouped);
            setTotalCarrotCoins(total);
        };

        fetchExpenses();
    }, []);

    const categoryIcons = categories.reduce((acc, cat) => {
        cat.subcategories.forEach(sub => {
            acc[sub.toLowerCase()] = cat.icon;
        });
        return acc;
    }, {});

    return (
        <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
            <OverviewHeader />
            <Text style={styles.title}>Your Carrot Trail</Text>
            <Text style={styles.balance}>Burrow Balance: {totalCarrotCoins}</Text>

            <FlatList
                data={Object.entries(expensesByDate)}
                keyExtractor={([date]) => date}
                renderItem={({ item: [date, expenses] }) => (
                    <View style={styles.dateGroup}>
                        <Text style={styles.dateTitle}>{date}</Text>
                        {expenses.map((exp: any) => {
                            const icon = categoryIcons[exp.subcategory?.toLowerCase()] || require('@assets/icons/default.png');
                            return (
                                <View style={styles.expenseBox}>
                                    <View style={styles.expenseLeft}>
                                        <Image source={icon} style={styles.icon} />
                                        <Text
                                            style={[
                                                styles.subcategory,
                                                exp.subcategory?.length > 10 && styles.subcategoryMultiline,
                                            ]}
                                        >
                                            {exp.subcategory}
                                        </Text>
                                    </View>

                                    <View style={styles.amountBlock}>
                                        <View style={styles.amountRow}>
                                            <Image
                                                source={require('@assets/icons/carrotcoinlist.png')}
                                                style={styles.carrotImage}
                                            />
                                            <Text style={styles.amountText}>{exp.amount}</Text>
                                        </View>
                                        <Text style={styles.carrotCoinText}>CarrotCoins</Text>
                                    </View>
                                </View>


                            );
                        })}
                    </View>
                )}
            />

            <View style={styles.addBtnWrapper}>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/tabs/expenses/add')}>
                    <Image source={bunnyIcon} style={styles.bunnyIcon} />
                    <Text style={styles.addBtnText}>Add Bunnyspense</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
}