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
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useRouter } from 'expo-router';

type BudgetSelectorProps = {
    onBudgetChange?: (id: string | null) => void;
    onNewBudget?: () => void;
    selectedBudget?: string | null;
    onCancel?: () => void;
};

export default function BudgetSelector({ onBudgetChange, onNewBudget, selectedBudget, onCancel }: BudgetSelectorProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [budgets, setBudgets] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(selectedBudget || null);
    const selectedName = budgets.find((b) => b.id === selectedId)?.name ?? 'Select Budget';
    const router = useRouter();

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

    const handleNewBudget = () => {
        setModalVisible(false);
        onNewBudget?.();
    };

    const handleCancel = () => {
        setModalVisible(false);
        onCancel?.();
        router.back();
    };

    return (
        <>
            <TouchableOpacity style={styles.bar} onPress={() => setModalVisible(true)}>
                <Ionicons name="wallet-outline" size={24} color="#91483C" style={styles.walletIcon} />
                <Text style={styles.barText}>{selectedName}</Text>
                <Ionicons name="chevron-down" size={20} color="#91483C" style={styles.arrowIcon} />
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
                    <View style={styles.header}>
                        <Text style={styles.title}>Select a Budget</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#91483C" />
                        </TouchableOpacity>
                    </View>

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
                                <Text style={[styles.itemText, selectedId === item.id && styles.selectedItemText]}>
                                    {item.name}
                                </Text>
                                {selectedId === item.id && (
                                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                )}
                            </TouchableOpacity>
                        )}
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleNewBudget}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="#91483C" />
                            <Text style={styles.addButtonText}>New Budget</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                        >
                            <Ionicons name="arrow-back-circle-outline" size={24} color="#666" />
                            <Text style={styles.cancelButtonText}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    bar: {
        width: '90%',
        backgroundColor: '#fff0e8',
        padding: 12,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: '#91483C',
    },
    walletIcon: {
        marginRight: 8,
    },
    barText: {
        fontWeight: '600',
        fontSize: 16,
        color: '#91483C',
    },
    arrowIcon: {
        position: 'absolute',
        right: 16,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        maxHeight: height * 0.7,
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
    },
    item: {
        padding: 16,
        backgroundColor: '#fff0e8',
        borderRadius: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#91483C',
    },
    selectedItem: {
        backgroundColor: '#91483C',
    },
    itemText: {
        fontSize: 16,
        color: '#91483C',
        fontWeight: '500',
    },
    selectedItemText: {
        color: '#fff',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    addButton: {
        flex: 1,
        backgroundColor: '#fff0e8',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginRight: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#91483C',
    },
    addButtonText: {
        color: '#91483C',
        fontWeight: '600',
        marginLeft: 8,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginLeft: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
        marginLeft: 8,
    },
});
