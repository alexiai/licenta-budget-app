
import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExtractedData {
    amount?: number;
    date?: string;
    category?: string;
    subcategory?: string;
    rawText: string;
    confidence: number;
    merchantName?: string;
    layout?: any;
}

interface MatchResult {
    isMatch: boolean;
    confidence: number;
    bestMatch?: any;
}

interface ExtractionResultsProps {
    selectedImage: string;
    extractedData: ExtractedData;
    editableAmount: string;
    setEditableAmount: (amount: string) => void;
    editableDate: string;
    setEditableDate: (date: string) => void;
    awaitingDateInput: boolean;
    matchResult: MatchResult | null;
    learningTips: string[];
    feedbackSuggestions: any[];
    onSaveExpense: () => void;
    onReset: () => void;
    onShowFeedback: () => void;
}

export default function ExtractionResults({
                                              selectedImage,
                                              extractedData,
                                              editableAmount,
                                              setEditableAmount,
                                              editableDate,
                                              setEditableDate,
                                              awaitingDateInput,
                                              matchResult,
                                              learningTips,
                                              feedbackSuggestions,
                                              onSaveExpense,
                                              onReset,
                                              onShowFeedback
                                          }: ExtractionResultsProps) {
    return (
        <View style={styles.resultContainer}>
            <View style={styles.imageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.receiptImage} />
            </View>

            <View style={styles.confirmationCard}>
                <Text style={styles.confirmationTitle}>📊 Extracted Data</Text>

                <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Amount (RON):</Text>
                    <TextInput
                        style={styles.dataInput}
                        value={editableAmount}
                        onChangeText={setEditableAmount}
                        placeholder="Enter amount"
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Date:</Text>
                    <TextInput
                        style={styles.dataInput}
                        value={editableDate}
                        onChangeText={setEditableDate}
                        placeholder="YYYY-MM-DD"
                    />
                </View>

                <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Category:</Text>
                    <Text style={styles.dataValue}>
                        {extractedData.category || (extractedData.rawText === 'OCR_FAILED' ? 'Will be detected from manual input' : 'Not detected')}
                    </Text>
                </View>

                <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Subcategory:</Text>
                    <Text style={styles.dataValue}>
                        {extractedData.subcategory || (extractedData.rawText === 'OCR_FAILED' ? 'Will be detected from manual input' : 'Not detected')}
                    </Text>
                </View>

                {extractedData.rawText === 'OCR_FAILED' && (
                    <View style={styles.warningContainer}>
                        <Text style={styles.warningText}>
                            ⚠️ OCR completely failed. Please enter amount and date manually. The AI will learn from this failure.
                        </Text>
                    </View>
                )}

                {awaitingDateInput && !editableDate && (
                    <Text style={styles.warningText}>
                        ⚠️ Date not detected. Please enter the date manually.
                    </Text>
                )}

                {matchResult?.isMatch && (
                    <View style={styles.matchContainer}>
                        <Text style={styles.matchTitle}>🎯 Pattern Match Found</Text>
                        <Text style={styles.matchText}>
                            Similar to {matchResult.bestMatch?.metadata.receiptType} layout ({matchResult.confidence}% match)
                        </Text>
                        <Text style={styles.matchSubtext}>
                            Applied learned extraction rules automatically
                        </Text>
                    </View>
                )}

                {learningTips.length > 0 && (
                    <View style={styles.tipsContainer}>
                        <Text style={styles.tipsTitle}>💡 Learning Tips</Text>
                        {learningTips.slice(0, 2).map((tip, index) => (
                            <Text key={index} style={styles.tipText}>{tip}</Text>
                        ))}
                    </View>
                )}

                {extractedData.confidence < 70 && feedbackSuggestions.length > 0 && (
                    <TouchableOpacity
                        style={styles.feedbackButton}
                        onPress={onShowFeedback}
                    >
                        <Ionicons name="school" size={16} color="#91483C" />
                        <Text style={styles.feedbackButtonText}>
                            Help me learn from this receipt
                        </Text>
                    </TouchableOpacity>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.retryButton} onPress={onReset}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            (!editableAmount || !editableDate) && styles.saveButtonDisabled
                        ]}
                        onPress={onSaveExpense}
                        disabled={!editableAmount || !editableDate}
                    >
                        <Text style={styles.saveButtonText}>Save Expense</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    resultContainer: {
        paddingVertical: 20,
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    receiptImage: {
        width: 250,
        height: 300,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#91483C',
    },
    confirmationCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 20,
        marginTop: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    confirmationTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 20,
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
    dataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
    },
    dataLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        width: 100,
        fontFamily: 'Fredoka',
    },
    dataValue: {
        fontSize: 16,
        color: '#333',
        flex: 1,
        fontFamily: 'Fredoka',
    },
    dataInput: {
        fontSize: 16,
        color: '#333',
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontFamily: 'Fredoka',
    },
    warningText: {
        fontSize: 14,
        color: '#FF6B47',
        textAlign: 'center',
        marginVertical: 10,
        fontFamily: 'Fredoka',
    },
    warningContainer: {
        backgroundColor: '#FFF3E0',
        borderRadius: 12,
        padding: 16,
        marginVertical: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B47',
    },
    matchContainer: {
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: 16,
        marginVertical: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    matchTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1976D2',
        marginBottom: 8,
        fontFamily: 'Fredoka',
    },
    matchText: {
        fontSize: 14,
        color: '#1565C0',
        marginBottom: 4,
        fontFamily: 'Fredoka',
    },
    matchSubtext: {
        fontSize: 12,
        color: '#42A5F5',
        fontStyle: 'italic',
        fontFamily: 'Fredoka',
    },
    tipsContainer: {
        backgroundColor: '#E8F5E8',
        borderRadius: 12,
        padding: 16,
        marginVertical: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 8,
        fontFamily: 'Fredoka',
    },
    tipText: {
        fontSize: 14,
        color: '#388E3C',
        marginBottom: 4,
        fontFamily: 'Fredoka',
    },
    feedbackButton: {
        backgroundColor: '#FFF2D8',
        borderRadius: 12,
        padding: 12,
        marginVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#91483C',
    },
    feedbackButtonText: {
        fontSize: 14,
        color: '#91483C',
        marginLeft: 8,
        fontFamily: 'Fredoka',
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    retryButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 15,
        paddingVertical: 12,
        alignItems: 'center',
    },
    retryButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
        fontFamily: 'Fredoka',
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#91483C',
        borderRadius: 15,
        paddingVertical: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    saveButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
        fontFamily: 'Fredoka',
    },
});
