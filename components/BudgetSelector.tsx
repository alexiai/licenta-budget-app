import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TouchableWithoutFeedback,
    Dimensions,
    Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useRouter } from 'expo-router';

type BudgetSelectorProps = {
    onBudgetChange?: (id: string | null) => void;
    onNewBudget?: () => void;
    selectedBudget?: string | null;
};

interface Budget {
    id: string;
    name: string;
    userId: string;
}

export default function BudgetSelector({ onBudgetChange, onNewBudget, selectedBudget }: BudgetSelectorProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(selectedBudget || null);
    const selectedName = budgets.find((b) => b.id === selectedId)?.name ?? 'Select Budget';
    const router = useRouter();

    const fetchBudgets = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            
            const q = query(collection(db, 'budgets'), where('userId', '==', user.uid));
            const snap = await getDocs(q);
            const docs = snap.docs.map((doc) => ({ 
                id: doc.id, 
                ...doc.data() 
            })) as Budget[];
            
            // Remove any duplicates by ID
            const uniqueDocs = docs.filter((doc, index, self) => 
                index === self.findIndex((d) => d.id === doc.id)
            );
            
            setBudgets(uniqueDocs);
        } catch (error) {
            console.error('Error fetching budgets:', error);
            Alert.alert('Error', 'Failed to fetch budgets. Please try again.');
        }
    };

    useEffect(() => {
        fetchBudgets();
    }, []);

    useEffect(() => {
        const loadStoredBudget = async () => {
            const stored = await AsyncStorage.getItem('selectedBudget');
            if (stored) {
                setSelectedId(stored);
                onBudgetChange?.(stored);
            }
        };
        loadStoredBudget();
    }, []);

    const handleSelect = async (id: string) => {
        setSelectedId(id);
        await AsyncStorage.setItem('selectedBudget', id);
        setModalVisible(false);
        onBudgetChange?.(id);
    };

    const handleDelete = async (budgetId: string) => {
        Alert.alert(
            "Delete Budget",
            "Are you sure you want to delete this budget? This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Delete from Firestore
                            await deleteDoc(doc(db, 'budgets', budgetId));
                            
                            // Update local state
                            setBudgets(prev => prev.filter(b => b.id !== budgetId));
                            
                            // If the deleted budget was selected, clear the selection
                            if (selectedId === budgetId) {
                                setSelectedId(null);
                                await AsyncStorage.removeItem('selectedBudget');
                                onBudgetChange?.(null);
                            }
                            
                            // Close the modal
                            setModalVisible(false);
                            
                            Alert.alert('Success', 'Budget deleted successfully');
                        } catch (error) {
                            console.error('Error deleting budget:', error);
                            Alert.alert('Error', 'Failed to delete budget. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const handleNewBudget = () => {
        setModalVisible(false);
        if (onNewBudget) {
            onNewBudget();
        } else {
            router.push('/tabs/budget/onboarding');
        }
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
                            <View style={styles.itemContainer}>
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
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDelete(item.id)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                </TouchableOpacity>
                            </View>
                        )}
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.addButton, { flex: 1 }]}
                            onPress={handleNewBudget}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="#91483C" />
                            <Text style={styles.addButtonText}>New Budget</Text>
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
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    item: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff0e8',
        borderRadius: 12,
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
    deleteButton: {
        padding: 12,
        marginLeft: 8,
        backgroundColor: '#fff0e8',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ff4444',
    },
});
