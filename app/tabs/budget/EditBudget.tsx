import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import styles from '@styles/editBudget';
import DraggableFlatList from 'react-native-draggable-flatlist';

type EditBudgetProps = {
    categories: any[];
    onChange: (newCategories: any[]) => void;
};

export default function EditBudget({ categories, onChange }: EditBudgetProps) {
    const handleDelete = (catIndex: number, subIndex: number) => {
        const updated = [...categories];
        updated[catIndex].subcategories.splice(subIndex, 1);
        onChange(updated);
    };

    const handleAmountChange = (catIndex: number, subIndex: number, value: string) => {
        const updated = [...categories];
        updated[catIndex].subcategories[subIndex].amount = value;
        onChange(updated);
    };

    const handleDragEnd = (catIndex: number, data: any[]) => {
        const updated = [...categories];
        updated[catIndex].subcategories = data;
        onChange(updated);
    };

    const handleAddSub = (catIndex: number) => {
        const updated = [...categories];
        updated[catIndex].subcategories.push({ name: 'New Subcategory', amount: '0' });
        onChange(updated);
    };

    return (
        <>
            {categories.map((cat, i) => (
                <View key={i}>
                    <Text style={styles.section}>{cat.name}</Text>

                    <DraggableFlatList
                        data={cat.subcategories}
                        keyExtractor={(_, index) => `sub-${i}-${index}`}
                        onDragEnd={({ data }) => handleDragEnd(i, data)}
                        renderItem={({ item, drag, isActive, index }) => (
                            <TouchableOpacity
                                style={[
                                    styles.itemRow,
                                    isActive && { opacity: 0.5, borderColor: '#aaa', backgroundColor: '#eee' },
                                ]}
                                onLongPress={drag}
                                delayLongPress={200}
                            >
                                <Feather
                                    name="minus-circle"
                                    size={20}
                                    color="#e74c3c"
                                    onPress={() => handleDelete(i, index)}
                                />
                                <Text style={[styles.itemText, { flex: 1, marginLeft: 8 }]}>{item.name}</Text>
                                <TextInput
                                    style={[styles.itemText, { width: 60, textAlign: 'right' }]}
                                    value={String(item.amount)}
                                    onChangeText={(text) => handleAmountChange(i, index, text)}
                                    keyboardType="numeric"
                                />
                            </TouchableOpacity>
                        )}
                    />

                    <TouchableOpacity
                        style={styles.addSubBtn}
                        onPress={() => handleAddSub(i)}
                    >
                        <Text style={styles.addSubText}>+ Add new subcategory</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </>
    );
}
