import { View, Text, Image, ScrollView, ImageBackground, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useEffect, useState } from 'react';
import { auth, db } from '@lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import styles from '@styles/overviewCalendar';
import OverviewHeader from '@components/OverviewHeader';
import bg from '@assets/bg/background3.png';
import iconGood from '@assets/icons/calendarGood.png';
import iconMedium from '@assets/icons/calendarMedium.png';
import iconBad from '@assets/icons/calendarBad.png';
import { getPeriodRange } from '@lib/utils/budgetPeriods';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDateToDDMMYYYY, parseExpenseDate, toISODateString } from '@lib/utils/dateUtils';

const { width } = Dimensions.get('window');

export default function CalendarOverview() {
    const [markedDates, setMarkedDates] = useState<any>({});
    const [totalCarrotCoins, setTotalCarrotCoins] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [expenses, setExpenses] = useState<any[]>([]);
    const [budget, setBudget] = useState<any>(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        let active = true;
        const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', user.uid));
        const budgetsQuery = query(collection(db, 'budgets'), where('userId', '==', user.uid));
        const stopExpenses = onSnapshot(expensesQuery, snapshot => {
            setExpenses(snapshot.docs.map(item => item.data()));
        });
        const stopBudgets = onSnapshot(budgetsQuery, async snapshot => {
            const selection = await AsyncStorage.getItem('selectedBudget').catch(() => null);
            const item = snapshot.docs.find(budget => budget.id === selection) ?? snapshot.docs[0];
            if (active) setBudget(item ? { ...item.data(), id: item.id } : null);
        });
        return () => {
            active = false;
            stopExpenses();
            stopBudgets();
        };
    }, []);

    useEffect(() => {
        if (!budget) {
            setMarkedDates({});
            return;
        }

        const totalIncome = budget.incomes?.length
            ? budget.incomes.reduce((sum: number, income: { amount: string }) => sum + (Number(income.amount) || 0), 0)
            : Number(budget.amount) || 0;

        // Use selectedMonth for filtering
        const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
        const filteredExpenses = expenses.filter(exp => {
            const expDate = parseExpenseDate(exp.date);
            return (!exp.budgetId || exp.budgetId === budget.id)
                && expDate !== null && expDate >= firstDay && expDate < nextMonth;
        });

        const groupedExpenses: any = {};
        filteredExpenses.forEach(exp => {
            const date = toISODateString(parseExpenseDate(exp.date)!);
            if (!groupedExpenses[date]) groupedExpenses[date] = 0;
            groupedExpenses[date] += parseFloat(exp.amount || '0');
        });

        const marks: any = {};
        Object.keys(groupedExpenses).forEach(date => {
            const amount = groupedExpenses[date];
            const { start, end } = getPeriodRange(parseExpenseDate(date)!, budget.period, budget.startDay);
            const periodDays = (Date.parse(toISODateString(end)) - Date.parse(toISODateString(start))) / 86_400_000 + 1;
            if (totalIncome <= 0) return;
            const percentage = amount / (totalIncome / periodDays);

            let icon = iconGood;
            if (percentage > 0.75) icon = iconBad;
            else if (percentage >= 0.33) icon = iconMedium;

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
    }, [selectedMonth, expenses, budget]);

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
                <ScrollView>
                <View style={styles.calendarWrapper}>
                    <Calendar
                        markingType={'custom'}
                        markedDates={markedDates}
                        dayComponent={renderDay}
                        onMonthChange={(month: { year: number; month: number }) => {
                            setSelectedMonth(new Date(month.year, month.month - 1, 1));
                        }}
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
                        <Text style={styles.legendText}>Below 33% of daily budget</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Image source={iconMedium} style={styles.legendIcon} resizeMode="contain" />
                        <Text style={styles.legendText}>33% to 75% of daily budget</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Image source={iconBad} style={styles.legendIcon} resizeMode="contain" />
                        <Text style={styles.legendText}>Above 75% of daily budget</Text>
                    </View>
                </View>
            </ScrollView>
        </ImageBackground>
    );
}
