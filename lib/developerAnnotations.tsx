import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { receiptStorageSystem } from './receiptStorage';
import type { ReceiptMetadata } from './receiptStorage';

interface DeveloperAnnotationData {
    layoutDescription: string;
    extractionNotes: string;
    specialFeatures: string[];
    difficultyLevel: 'easy' | 'medium' | 'hard';
    recommendedImprovements: string[];
}

interface DeveloperAnnotationModalProps {
    visible: boolean;
    onClose: () => void;
    receiptId: string;
    currentMetadata: Omit<ReceiptMetadata, 'imageId' | 'timestamp' | 'userId'>;
    onSave: (annotations: ReceiptMetadata['developerAnnotations']) => void;
}

export function DeveloperAnnotationModal({ visible, onClose, receiptId, currentMetadata, onSave }: DeveloperAnnotationModalProps) {
    const [data, setData] = useState<DeveloperAnnotationData>({
        layoutDescription: currentMetadata.developerAnnotations?.layoutDescription || '',
        extractionNotes: currentMetadata.developerAnnotations?.extractionNotes || '',
        specialFeatures: currentMetadata.developerAnnotations?.specialFeatures || [],
        difficultyLevel: currentMetadata.developerAnnotations?.difficultyLevel || 'medium',
        recommendedImprovements: currentMetadata.developerAnnotations?.recommendedImprovements || []
    });

    const handleSave = async () => {
        try {
            const annotations: ReceiptMetadata['developerAnnotations'] = {
                layoutDescription: data.layoutDescription,
                extractionNotes: data.extractionNotes,
                specialFeatures: data.specialFeatures,
                difficultyLevel: data.difficultyLevel,
                recommendedImprovements: data.recommendedImprovements
            };

            await receiptStorageSystem.addDeveloperAnnotations(receiptId, annotations);
            onSave(annotations);
            onClose();
        } catch (error) {
            console.error('Error saving annotations:', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const metadataOverview = {
        receiptType: currentMetadata.receiptType,
        dateLocation: currentMetadata.dateLocation,
        amountLocation: currentMetadata.amountLocation,
        wasCorrected: currentMetadata.wasCorrected,
        ocrConfidence: currentMetadata.ocrConfidence,
        receiptQuality: currentMetadata.receiptQuality
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Developer Annotations</Text>

                    <ScrollView style={styles.scrollContent}>
                        {/* Metadata Overview */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Receipt Overview</Text>
                            {Object.entries(metadataOverview).map(([key, value]) => (
                                <Text key={key} style={styles.metadataItem}>
                                    {key}: {String(value)}
                                </Text>
                            ))}
                        </View>

                        {/* Layout Description */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Layout Description</Text>
                            <TextInput
                                style={styles.input}
                                multiline
                                value={data.layoutDescription}
                                onChangeText={(text) => setData({ ...data, layoutDescription: text })}
                                placeholder="Describe the receipt layout..."
                            />
                        </View>

                        {/* Extraction Notes */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Extraction Notes</Text>
                            <TextInput
                                style={styles.input}
                                multiline
                                value={data.extractionNotes}
                                onChangeText={(text) => setData({ ...data, extractionNotes: text })}
                                placeholder="Notes about OCR extraction..."
                            />
                        </View>

                        {/* Difficulty Level */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Difficulty Level</Text>
                            <View style={styles.difficultyButtons}>
                                {['easy', 'medium', 'hard'].map((level) => (
                                    <TouchableOpacity
                                        key={level}
                                        style={[
                                            styles.difficultyButton,
                                            data.difficultyLevel === level && styles.selectedDifficulty
                                        ]}
                                        onPress={() => setData({ ...data, difficultyLevel: level as 'easy' | 'medium' | 'hard' })}
                                    >
                                        <Text style={[
                                            styles.difficultyText,
                                            data.difficultyLevel === level && styles.selectedDifficultyText
                                        ]}>
                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>Save Annotations</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 20,
        textAlign: 'center',
    },
    scrollContent: {
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    metadataItem: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    label: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    difficultyButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    difficultyButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
    },
    selectedDifficulty: {
        backgroundColor: '#91483C',
    },
    difficultyText: {
        color: '#666',
        fontWeight: '600',
    },
    selectedDifficultyText: {
        color: 'white',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    cancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
    },
    saveButton: {
        flex: 2,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#91483C',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
    },
}); 