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

    useEffect(() => {
        const current = pathname.split('/').pop();
        console.log('🔁 [Header] pathname:', pathname, '→ selectedView:', current);

        if (current === 'list' || current === 'chart' || current === 'calendar') {
            if (selectedView !== current) {
                setSelectedView(current); // typescript știe că e valid aici
            }
        }
    }, [pathname]);

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
                    console.log('🧭 Navigating to onboarding from "+"...');
                    router.push('/tabs/budget/onboarding?mode=create'); // 🔁 trebuie să fie corect path-ul
                }}
            />



            {!hideSwitch && (
                <View style={styles.switchRow}>
                    {['list', 'chart', 'calendar'].map(view => (
                        <TouchableOpacity
                            key={view}
                            style={[styles.switchBtn, selectedView === view && styles.switchBtnActive]}
                            onPress={() => handleSwitch(view as any)}
                        >
                            <Text style={styles.switchText}>{view.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}
