
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageCaptureProps {
    showImageOptions: boolean;
    setShowImageOptions: (show: boolean) => void;
    takePhoto: () => void;
    pickImage: () => void;
}

export default function ImageCapture({
                                         showImageOptions,
                                         setShowImageOptions,
                                         takePhoto,
                                         pickImage
                                     }: ImageCaptureProps) {
    return (
        <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>🧾 Scan Your Receipt</Text>
            <Text style={styles.emptyStateText}>
                Take a photo of your receipt and the AI will extract the expenses.
                {'\n\n'}
                It's fairly simple — for example, if the receipt contains food items, it goes into Groceries;
                if it's a cinema receipt, it's Entertainment, and so on. Usually, a receipt only fits one category,
                so the detection logic doesn't have to be too complex.
            </Text>

            <TouchableOpacity
                style={styles.scanButton}
                onPress={() => {
                    if (Platform.OS === 'web') {
                        setShowImageOptions(true);
                    } else {
                        // On mobile, would show native alert
                        setShowImageOptions(true);
                    }
                }}
            >
                <Ionicons name="camera" size={24} color="white" />
                <Text style={styles.scanButtonText}>Scan Receipt</Text>
            </TouchableOpacity>

            {/* Image Options Modal for Web */}
            <Modal
                visible={showImageOptions}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowImageOptions(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Image Source</Text>
                        <Text style={styles.modalSubtitle}>Choose how you want to add a receipt image:</Text>

                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => {
                                setShowImageOptions(false);
                                takePhoto();
                            }}
                        >
                            <Ionicons name="camera" size={24} color="#91483C" />
                            <Text style={styles.modalButtonText}>Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => {
                                setShowImageOptions(false);
                                pickImage();
                            }}
                        >
                            <Ionicons name="image" size={24} color="#91483C" />
                            <Text style={styles.modalButtonText}>Choose from Library</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCancelButton}
                            onPress={() => setShowImageOptions(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyStateTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 16,
        fontFamily: 'Fredoka',
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#8B6914',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        fontFamily: 'Fredoka',
    },
    scanButton: {
        backgroundColor: '#91483C',
        borderRadius: 25,
        paddingVertical: 16,
        paddingHorizontal: 32,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    scanButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
        fontFamily: 'Fredoka',
    },
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
        maxWidth: 400,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
        fontFamily: 'Fredoka',
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'Fredoka',
    },
    modalButton: {
        backgroundColor: '#FFF2D8',
        borderRadius: 15,
        padding: 16,
        marginBottom: 12,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonText: {
        fontSize: 16,
        color: '#91483C',
        fontWeight: '600',
        marginLeft: 12,
        fontFamily: 'Fredoka',
    },
    modalCancelButton: {
        padding: 16,
        width: '100%',
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 16,
        color: '#999',
        fontFamily: 'Fredoka',
    },
});
