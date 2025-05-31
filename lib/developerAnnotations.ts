
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { receiptStorageSystem } from './receiptStorage';
import type { ReceiptMetadata } from './receiptStorage';

interface DeveloperAnnotationProps {
    visible: boolean;
    onClose: () => void;
    receiptId: string;
    currentMetadata: ReceiptMetadata;
    onSave: (annotations: ReceiptMetadata['developerAnnotations']) => void;
}

export function DeveloperAnnotationModal({
                                             visible,
                                             onClose,
                                             receiptId,
                                             currentMetadata,
                                             onSave
                                         }: DeveloperAnnotationProps) {
    const [layoutDescription, setLayoutDescription] = useState('');
    const [extractionNotes, setExtractionNotes] = useState('');
    const [specialFeatures, setSpecialFeatures] = useState<string[]>([]);
    const [difficultyLevel, setDifficultyLevel] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [recommendedImprovements, setRecommendedImprovements] = useState<string[]>([]);
    const [newFeature, setNewFeature] = useState('');
    const [newImprovement, setNewImprovement] = useState('');

    const addSpecialFeature = () => {
        if (newFeature.trim()) {
            setSpecialFeatures([...specialFeatures, newFeature.trim()]);
            setNewFeature('');
        }
    };

    const addRecommendedImprovement = () => {
        if (newImprovement.trim()) {
            setRecommendedImprovements([...recommendedImprovements, newImprovement.trim()]);
            setNewImprovement('');
        }
    };

    const removeFeature = (index: number) => {
        setSpecialFeatures(specialFeatures.filter((_, i) => i !== index));
    };

    const removeImprovement = (index: number) => {
        setRecommendedImprovements(recommendedImprovements.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        const annotations: ReceiptMetadata['developerAnnotations'] = {
            layoutDescription,
            extractionNotes,
            specialFeatures,
            difficultyLevel,
            recommendedImprovements
        };

        try {
            await receiptStorageSystem.addDeveloperAnnotations(receiptId, annotations);
            onSave(annotations);
            onClose();
        } catch (error) {
            console.error('Error saving annotations:', error);
        }
    };

    if (!__DEV__) {
        return null; // Only show in development mode
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
    <ScrollView style={styles.container}>
    <View style={styles.header}>
    <Text style={styles.title}>🔧 Developer Annotations</Text>
    <Text style={styles.subtitle}>Receipt ID: {receiptId}</Text>
    </View>

    <View style={styles.section}>
    <Text style={styles.sectionTitle}>Receipt Overview</Text>
    <Text style={styles.info}>Type: {currentMetadata.receiptType}</Text>
    <Text style={styles.info}>Date Location: {currentMetadata.dateLocation}</Text>
    <Text style={styles.info}>Amount Location: {currentMetadata.amountLocation}</Text>
    <Text style={styles.info}>Was Corrected: {currentMetadata.wasCorrected ? 'Yes' : 'No'}</Text>
    <Text style={styles.info}>OCR Confidence: {currentMetadata.ocrConfidence}%</Text>
    <Text style={styles.info}>Quality: {currentMetadata.receiptQuality}</Text>
    </View>

    <View style={styles.section}>
    <Text style={styles.sectionTitle}>Layout Description</Text>
    <TextInput
    style={styles.textArea}
    value={layoutDescription}
    onChangeText={setLayoutDescription}
    placeholder="Describe the receipt layout (e.g., 'Date at top-right corner, total prominently displayed at bottom')"
    multiline
    numberOfLines={3}
    />
    </View>

    <View style={styles.section}>
    <Text style={styles.sectionTitle}>Extraction Notes</Text>
    <TextInput
    style={styles.textArea}
    value={extractionNotes}
    onChangeText={setExtractionNotes}
    placeholder="Notes about OCR extraction performance and any issues encountered"
    multiline
    numberOfLines={3}
    />
    </View>

    <View style={styles.section}>
    <Text style={styles.sectionTitle}>Difficulty Level</Text>
    <View style={styles.buttonRow}>
        {(['easy', 'medium', 'hard'] as const).map((level) => (
            <TouchableOpacity
                key={level}
    style={[
            styles.difficultyButton,
        difficultyLevel === level && styles.selectedButton
]}
    onPress={() => setDifficultyLevel(level)}
>
    <Text style={[
            styles.buttonText,
        difficultyLevel === level && styles.selectedButtonText
]}>
    {level.charAt(0).toUpperCase() + level.slice(1)}
    </Text>
    </TouchableOpacity>
))}
    </View>
    </View>

    <View style={styles.section}>
    <Text style={styles.sectionTitle}>Special Features</Text>
    <View style={styles.addItemRow}>
    <TextInput
        style={styles.addInput}
    value={newFeature}
    onChangeText={setNewFeature}
    placeholder="Add a special feature"
    />
    <TouchableOpacity style={styles.addButton} onPress={addSpecialFeature}>
    <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
        </View>
    {specialFeatures.map((feature, index) => (
        <View key={index} style={styles.listItem}>
    <Text style={styles.listItemText}>{feature}</Text>
        <TouchableOpacity onPress={() => removeFeature(index)}>
        <Text style={styles.removeButton}>×</Text>
    </TouchableOpacity>
    </View>
    ))}
    </View>

    <View style={styles.section}>
    <Text style={styles.sectionTitle}>Recommended Improvements</Text>
    <View style={styles.addItemRow}>
    <TextInput
        style={styles.addInput}
    value={newImprovement}
    onChangeText={setNewImprovement}
    placeholder="Add an improvement suggestion"
    />
    <TouchableOpacity style={styles.addButton} onPress={addRecommendedImprovement}>
    <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
        </View>
    {recommendedImprovements.map((improvement, index) => (
        <View key={index} style={styles.listItem}>
    <Text style={styles.listItemText}>{improvement}</Text>
        <TouchableOpacity onPress={() => removeImprovement(index)}>
        <Text style={styles.removeButton}>×</Text>
    </TouchableOpacity>
    </View>
    ))}
    </View>

    <View style={styles.buttonContainer}>
    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
    <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
    <Text style={styles.saveButtonText}>Save Annotations</Text>
    </TouchableOpacity>
    </View>
    </ScrollView>
    </Modal>
);
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#91483C',
        padding: 20,
        paddingTop: 60,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#FFF2D8',
    },
    section: {
        backgroundColor: 'white',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    info: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8,
    },
    difficultyButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    selectedButton: {
        backgroundColor: '#91483C',
    },
    buttonText: {
        color: '#333',
        fontWeight: '600',
    },
    selectedButtonText: {
        color: 'white',
    },
    addItemRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    addInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
    },
    addButton: {
        backgroundColor: '#91483C',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: 'center',
    },
    addButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        padding: 8,
        borderRadius: 6,
        marginBottom: 4,
    },
    listItemText: {
        flex: 1,
        color: '#333',
    },
    removeButton: {
        color: '#ff4444',
        fontSize: 20,
        fontWeight: 'bold',
        paddingHorizontal: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        margin: 16,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        flex: 2,
        backgroundColor: '#91483C',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
