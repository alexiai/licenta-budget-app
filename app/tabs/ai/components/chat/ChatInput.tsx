
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
    inputText: string;
    setInputText: (text: string) => void;
    isProcessing: boolean;
    isListening: boolean;
    checkSpeechRecognitionSupport: () => boolean;
    onSendMessage: () => void;
    onReceiptScan: () => void;
    startListening: () => void;
    stopListening: () => void;
}

export default function ChatInput({
                                      inputText,
                                      setInputText,
                                      isProcessing,
                                      isListening,
                                      checkSpeechRecognitionSupport,
                                      onSendMessage,
                                      onReceiptScan,
                                      startListening,
                                      stopListening
                                  }: ChatInputProps) {
    return (
        <View style={styles.inputContainer}>
            <TouchableOpacity
                style={[styles.receiptButton, isProcessing && styles.buttonDisabled]}
                onPress={onReceiptScan}
                disabled={isProcessing}
            >
                {isProcessing ? (
                    <ActivityIndicator size="small" color="#91483C" />
                ) : (
                    <Text style={styles.receiptEmoji}>🧾</Text>
                )}
            </TouchableOpacity>

            <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Scrie mesajul tău aici..."
                placeholderTextColor="#999"
                multiline
                onSubmitEditing={onSendMessage}
            />

            <TouchableOpacity
                style={[
                    styles.voiceButton,
                    !checkSpeechRecognitionSupport() && styles.voiceButtonDisabled
                ]}
                onPress={isListening ? stopListening : startListening}
                disabled={!checkSpeechRecognitionSupport()}
            >
                <Ionicons
                    name={isListening ? "stop" : "mic"}
                    size={24}
                    color={!checkSpeechRecognitionSupport() ? "#ccc" : (isListening ? "#FF4444" : "#91483C")}
                />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.sendButton}
                onPress={onSendMessage}
                disabled={!inputText.trim()}
            >
                <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: 'white',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        marginRight: 8,
    },
    receiptButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff0e8',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    receiptEmoji: {
        fontSize: 20,
    },
    voiceButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff0e8',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    voiceButtonDisabled: {
        backgroundColor: '#f5f5f5',
        opacity: 0.6,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#91483C',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
