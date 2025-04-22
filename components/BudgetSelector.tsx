import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TouchableWithoutFeedback,
    Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

type BudgetSelectorProps = {
    onBudgetChange?: (id: string | null) => void;
    onNewBudget?: () => void;
    selectedBudget?: string | null;
};

export default function BudgetSelector({ onBudgetChange, onNewBudget, selectedBudget }: BudgetSelectorProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [budgets, setBudgets] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(selectedBudget || null);
    const selectedName = budgets.find((b) => b.id === selectedId)?.name ?? 'Switch Budget';

    useEffect(() => {
        const loadSelected = async () => {
            const stored = await AsyncStorage.getItem('selectedBudget');
            if (stored) {
                setSelectedId(stored);
                onBudgetChange?.(stored);
            }
        };
        loadSelected();
    }, []);

    useEffect(() => {
        const fetchBudgets = async () => {
            const user = auth.currentUser;
            if (!user) return;
            const q = query(collection(db, 'budgets'), where('userId', '==', user.uid));
            const snap = await getDocs(q);
            const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setBudgets(docs);
        };
        fetchBudgets();
    }, [modalVisible]);

    const handleSelect = async (id: string) => {
        setSelectedId(id);
        await AsyncStorage.setItem('selectedBudget', id);
        setModalVisible(false);
        onBudgetChange?.(id);
    };

    return (
        <>
            <TouchableOpacity style={styles.bar} onPress={() => setModalVisible(true)}>
                <Text style={styles.barText}>📁 {selectedName}</Text>
                <Feather name="chevron-down" size={20} color="#333" style={styles.arrowIcon} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.overlay} />
                </TouchableWithoutFeedback>

                <View style={styles.modalView}>
                    <Text style={styles.title}>Select a Budget</Text>

                    <FlatList
                        data={budgets}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 10 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.item, selectedId === item.id && styles.selectedItem]}
                                onPress={() => handleSelect(item.id)}
                            >
                                <Text style={styles.itemText}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            setModalVisible(false);
                            onNewBudget?.();
                        }}
                    >
                        <Text style={styles.addButtonText}>➕ Add New Budget</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    bar: {
        width: '100%',
        backgroundColor: '#dfe6e9',
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    barText: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#000',
    },
    arrowIcon: {
        position: 'absolute',
        right: 16,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalView: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        maxHeight: height * 0.5,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    item: {
        padding: 12,
        backgroundColor: '#f1f2f6',
        borderRadius: 10,
        marginBottom: 10,
    },
    selectedItem: {
        backgroundColor: '#55efc4',
    },
    itemText: {
        fontSize: 16,
    },
    addButton: {
        backgroundColor: '#dfe6e9',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#b2bec3',
    },
    addButtonText: {
        color: '#636e72',
        fontWeight: 'bold',
    },
});
