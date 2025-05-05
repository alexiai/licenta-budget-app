import { View, Text, Image, ScrollView, ImageBackground, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useEffect, useState } from 'react';
import { auth, db } from '@lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import styles from '@styles/overviewCalendar';
import OverviewHeader from '@components/OverviewHeader';
import bg from '@assets/bg/background3.png';
import iconGood from '@assets/icons/calendarGood.png';
import iconMedium from '@assets/icons/calendarMedium.png';
import iconBad from '@assets/icons/calendarBad.png';

const { width } = Dimensions.get('window');

export default function CalendarOverview() {
    const [markedDates, setMarkedDates] = useState<any>({});
    const [totalCarrotCoins, setTotalCarrotCoins] = useState(0);


    useEffect(() => {
        const fetchExpensesAndBudget = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const [expSnap, budgetSnap] = await Promise.all([
                getDocs(query(collection(db, 'expenses'), where('userId', '==', user.uid))),
                getDocs(query(collection(db, 'budgets'), where('userId', '==', user.uid))),
            ]);

            const expenses = expSnap.docs.map(doc => doc.data());
            const budgets = budgetSnap.docs.map(doc => doc.data());

            if (!budgets.length) return;

            // ➔ logica NOUĂ pentru calcularea bugetului per zi în funcție de perioadă
            const budget = budgets[0];
            let totalIncome = 0;
            if (budget.incomes && budget.incomes.length > 0) {
                totalIncome = budget.incomes.reduce((sum: number, income: any) => {
                    return sum + parseFloat(income.amount || '0');
                }, 0);
            }

            const period = budget.period?.toLowerCase(); // 'monthly', 'weekly', 'bi-weekly

            let budgetPerDay;
            switch (period) {
                case 'weekly':
                    budgetPerDay = totalIncome / 7;
                    break;
                case 'bi-weekly':
                    budgetPerDay = totalIncome / 14;
                    break;
                default: // monthly sau dacă lipsește
                    budgetPerDay = totalIncome / 30;
            }

            const groupedExpenses: any = {};
            expenses.forEach(exp => {
                const date = new Date(exp.date).toISOString().split('T')[0];
                if (!groupedExpenses[date]) groupedExpenses[date] = 0;
                groupedExpenses[date] += parseFloat(exp.amount || '0');
            });

            const marks: any = {};
            Object.keys(groupedExpenses).forEach(date => {
                const amount = groupedExpenses[date];
                const percentage = amount / budgetPerDay;

                let icon = iconGood;
                if (percentage > 1.5) icon = iconBad;
                else if (percentage > 1.0) icon = iconMedium;

                marks[date] = {
                    customStyles: {
                        container: {
                            backgroundColor: 'transparent',
                            borderRadius: 20,
                        },
                        text: { color: 'transparent' },
                    },
                    icon,
                };
            });

            setMarkedDates(marks);
        };

        fetchExpensesAndBudget();
    }, []);

    const renderDay = ({ date }: any) => {
        const dateString = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
        const marking = markedDates[dateString];

        return (
            <View style={styles.dayContainer}>
                <Text style={styles.dayNumber}>{date.day}</Text>
                {marking?.icon && (
                    <Image
                        source={marking.icon}
                        style={styles.dayIcon}
                        resizeMode="contain"
                    />
                )}
            </View>
        );
    };

    return (
        <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
                <OverviewHeader />
                <Text style={styles.title}>Daily Hop</Text>
                <Text style={styles.balance}>Burrow Balance: {totalCarrotCoins}</Text>
                <ScrollView>
                <View style={styles.calendarWrapper}>
                    <Calendar
                        markingType={'custom'}
                        markedDates={markedDates}
                        dayComponent={renderDay}
                        theme={{
                            calendarBackground: 'transparent',
                            textSectionTitleColor: '#d5790d',
                            textDayHeaderFontFamily: 'Fredoka',
                            textMonthFontFamily: 'Fredoka',
                            textMonthFontWeight: 'bold',
                            textMonthFontSize: 18,
                            monthTextColor: '#d5790d',
                            arrowColor: '#d5790d',
                            'stylesheet.calendar.header': {
                                header: {
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    paddingHorizontal: 10,
                                    alignItems: 'center',
                                    marginBottom: 10,
                                },
                            },
                            'stylesheet.calendar.main': {
                                container: {
                                    padding: 0,
                                },
                            },
                        }}
                        style={styles.calendar}
                        hideExtraDays
                        firstDay={1}
                        enableSwipeMonths
                    />
                </View>

                <View style={styles.legendContainer}>
                    <Text style={styles.legendTitle}>Spending Legend</Text>
                    <View style={styles.legendItem}>
                        <Image source={iconGood} style={styles.legendIcon} resizeMode="contain" />
                        <Text style={styles.legendText}>Under budget (≤100%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Image source={iconMedium} style={styles.legendIcon} resizeMode="contain" />
                        <Text style={styles.legendText}>Slightly over (100-150%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Image source={iconBad} style={styles.legendIcon} resizeMode="contain" />
                        <Text style={styles.legendText}>Well over (&gt;150%)</Text>
                    </View>
                </View>
            </ScrollView>
        </ImageBackground>
    );

}
