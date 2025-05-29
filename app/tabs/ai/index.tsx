import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, Platform } from 'react-native';
import useWebSpeechRecognition from '../../../lib/hooks/useWebSpeechRecognition';

export default function AiScreen(): JSX.Element {
    const { isListening, transcript, startRecognition, reset } = useWebSpeechRecognition();
    const [parsed, setParsed] = useState<any>(null);

    useEffect(() => {
        if (transcript) {
            const result = parseExpense(transcript);
            setParsed(result);
        }
    }, [transcript]);

    const parseExpense = (text: string) => {
        const amountMatch = text.match(/(\d+([.,]\d{1,2})?)\s*(lei|ron)?/i);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null;

        const today = new Date().toISOString().split('T')[0];

        const mapping: { [key: string]: { category: string; subcategory: string } } = {
            "chirie": { category: "Housing", subcategory: "Rent" },
            "electricitate": { category: "Housing", subcategory: "Electricity" },
            "apă": { category: "Housing", subcategory: "Water" },
            "internet": { category: "Housing", subcategory: "Internet" },
            "cafea": { category: "Food & Drinks", subcategory: "Coffee" },
            "benzină": { category: "Transport", subcategory: "Gas" },
            "uber": { category: "Transport", subcategory: "Taxi" },
            "haine": { category: "Lifestyle", subcategory: "Clothes" },
            "pastile": { category: "Health", subcategory: "Medication" },
            "concert": { category: "Entertainment", subcategory: "Concerts" },
            "economii": { category: "Savings", subcategory: "Savings" },
            "diverse": { category: "Other", subcategory: "Miscellaneous" },
        };

        let detectedCategory = { category: 'Other', subcategory: 'Miscellaneous' };

        for (const key of Object.keys(mapping)) {
            if (text.toLowerCase().includes(key)) {
                detectedCategory = mapping[key];
                break;
            }
        }

        return {
            amount,
            category: detectedCategory.category,
            subcategory: detectedCategory.subcategory,
            date: today,
            note: text,
        };
    };

    useEffect(() => {
        console.log('📥 Transcript updated:', transcript);
        if (transcript) {
            const result = parseExpense(transcript);
            console.log('📦 Parsed result:', result);
            setParsed(result);
        }
    }, [transcript]);

    const handleSave = () => {
        if (!parsed || !parsed.amount) {
            console.warn('⚠️ Nu s-a putut extrage suma din:', transcript);
            Alert.alert('Eroare', 'Nu am putut extrage suma din voce.');
            return;
        }

        console.log('💾 Salvare:', parsed);

        Alert.alert(
            'Salvat!',
            `Am adăugat ${parsed.amount} lei la ${parsed.category} (${parsed.subcategory})`
        );

        reset();
        setParsed(null);
    };


    return (
        <View style={styles.container}>
            <Text style={styles.title}>🎙️ Voice Assistant – Web Ready</Text>
            <Button title={isListening ? 'Ascultă...' : 'Vorbește'} onPress={startRecognition} />
            {transcript !== '' && (
                <View style={styles.result}>
                    <Text style={styles.resultText}>📝 Transcriere: {transcript}</Text>
                    <Text style={styles.resultText}>💰 Suma: {parsed?.amount || '-'}</Text>
                    <Text style={styles.resultText}>🏷️ Categorie: {parsed?.category}</Text>
                    <Text style={styles.resultText}>🔹 Subcategorie: {parsed?.subcategory}</Text>
                    <Button title="✅ Salvează" onPress={handleSave} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefaf6',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 24,
        paddingTop: 64,
    },
    title: {
        fontSize: 22,
        textAlign: 'center',
        color: '#91483C',
        fontWeight: 'bold',
        marginBottom: 16,
    },
    result: {
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff0e8',
        width: '100%',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    resultText: {
        fontSize: 17,
        marginBottom: 6,
        color: '#333',
    },
});
