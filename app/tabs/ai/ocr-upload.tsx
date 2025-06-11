import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image,
    ImageBackground
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOCR } from './context/OCRContext';
import bg from '@assets/bg/AIback.png';

export default function OCRUpload() {
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { setOCRData } = useOCR();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            processImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            alert('Sorry, we need camera permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            processImage(result.assets[0].uri);
        }
    };

    const processImage = async (uri: string) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', {
                uri,
                type: 'image/jpeg',
                name: 'receipt.jpg',
            } as any);

            const response = await fetch('https://licenta-ocr-api.onrender.com/process-receipt', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again in a few minutes.');
                }
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log('OCR Response:', data);

            if (data.success) {
                setOCRData(data.data);
                router.push('/tabs/ai/chatbox');
            } else {
                throw new Error(data.error || 'Failed to process receipt');
            }
        } catch (error: any) {
            console.error('Error processing image:', error);
            alert(error.message || 'Error processing receipt. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <View style={styles.content}>
                <Text style={styles.title}>Upload Receipt</Text>
                <Text style={styles.subtitle}>Choose how you want to add your receipt</Text>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={takePhoto}>
                        <Ionicons name="camera" size={32} color="#91483C" />
                        <Text style={styles.buttonText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button} onPress={pickImage}>
                        <Ionicons name="images" size={32} color="#91483C" />
                        <Text style={styles.buttonText}>Choose from Gallery</Text>
                    </TouchableOpacity>
                </View>

                {image && (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: image }} style={styles.preview} />
                    </View>
                )}

                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#91483C" />
                        <Text style={styles.loadingText}>Processing receipt...</Text>
                    </View>
                )}

                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#91483C" />
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefaf6',
    },
    content: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
        marginTop: 20,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
    },
    button: {
        flex: 1,
        backgroundColor: '#fff0e8',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginHorizontal: 8,
        borderWidth: 1,
        borderColor: '#91483C',
    },
    buttonText: {
        color: '#91483C',
        marginTop: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    previewContainer: {
        width: '100%',
        aspectRatio: 4/3,
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#91483C',
    },
    preview: {
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#91483C',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff0e8',
        padding: 12,
        borderRadius: 12,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#91483C',
    },
    backButtonText: {
        color: '#91483C',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
}); 