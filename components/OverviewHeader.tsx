import { View, Text, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import BudgetSelector from '@components/BudgetSelector';
import styles from './OverviewHeaderStyles';

export default function OverviewHeader({
                                           onBudgetChange,
                                           hideSwitch = false,
                                       }: {
    onBudgetChange?: (id: string | null) => void;
    hideSwitch?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const currentView = pathname.split('/').pop(); // Obține ultima parte a căii
    const [selectedView, setSelectedView] = useState<'list' | 'chart' | 'calendar'>('list');
    const [budgetPlans, setBudgetPlans] = useState([]);
    const [selectedBudget, setSelectedBudget] = useState(null);
    const [budgetOpen, setBudgetOpen] = useState(false);

    useEffect(() => {
        const fetchBudgets = async () => {
            const user = auth.currentUser;
            if (!user) return;
            const q = query(collection(db, 'budgets'), where('userId', '==', user.uid));
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({ label: doc.data().name, value: doc.id }));
            setBudgetPlans(data);
        };
        fetchBudgets();
    }, []);

    const handleSwitch = (view: 'list' | 'chart' | 'calendar') => {
        if (view !== selectedView) {
            setSelectedView(view);
            router.replace(`/tabs/overview/${view}`);
        }
    };

    const handleBudgetChange = (val: any) => {
        setSelectedBudget(val);
        onBudgetChange?.(val);
    };

    return (
        <View style={styles.headerContainer}>
            <BudgetSelector
                onBudgetChange={handleBudgetChange}
                onNewBudget={() => {
                    router.push('/tabs/budget/onboarding?mode=create');
                }}
            />

            {!hideSwitch && (
                <View style={styles.switchRow}>
                    {['list', 'chart', 'calendar'].map(view => (
                        <TouchableOpacity
                            key={view}
                            style={[
                                styles.switchBtn,
                                currentView === view && styles.switchBtnActive
                            ]}
                            onPress={() => router.replace(`/tabs/overview/${view}`)}
                        >
                            <Text style={styles.switchText}>{view.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}

                </View>
            )}
        </View>
    );
}
