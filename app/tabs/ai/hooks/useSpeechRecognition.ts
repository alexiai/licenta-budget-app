
import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';

export const useSpeechRecognition = (onResult: (text: string) => void) => {
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    const initializeSpeechRecognition = () => {
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (!SpeechRecognition) {
                console.log('Speech Recognition not available in this browser');
                return;
            }

            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.lang = 'ro-RO';
            recognitionInstance.interimResults = false;
            recognitionInstance.maxAlternatives = 3;
            recognitionInstance.continuous = false;

            recognitionInstance.onstart = () => {
                console.log('Speech recognition started');
                setIsListening(true);
            };

            recognitionInstance.onresult = (event: any) => {
                if (event.results && event.results[0] && event.results[0][0]) {
                    const spokenText = event.results[0][0].transcript;
                    console.log('Speech recognition result:', spokenText);
                    onResult(spokenText);
                }
            };

            recognitionInstance.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);

                let errorMessage = 'Nu am putut înțelege ce ai spus. Încearcă din nou.';
                if (event.error === 'network') {
                    errorMessage = 'Eroare de rețea. Verifică conexiunea la internet.';
                } else if (event.error === 'not-allowed') {
                    errorMessage = 'Accesul la microfon nu este permis. Verifică setările browserului.';
                } else if (event.error === 'no-speech') {
                    errorMessage = 'Nu am detectat nicio voce. Încearcă să vorbești mai tare.';
                }

                Alert.alert('Eroare vocală', errorMessage);
            };

            recognitionInstance.onend = () => {
                console.log('Speech recognition ended');
                setIsListening(false);
            };

            setRecognition(recognitionInstance);
        } catch (error) {
            console.log('Speech Recognition initialization error:', error);
        }
    };

    const checkSpeechRecognitionSupport = (): boolean => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        return !!SpeechRecognition;
    };

    const startListening = () => {
        if (!checkSpeechRecognitionSupport()) {
            Alert.alert(
                'Funcție indisponibilă',
                'Recunoașterea vocală nu este suportată în acest browser. Încearcă Chrome sau Edge.'
            );
            return;
        }

        if (!recognition) {
            Alert.alert('Eroare', 'Recunoașterea vocală nu este inițializată.');
            return;
        }

        try {
            recognition.start();
        } catch (error) {
            console.log('Start listening error:', error);
            Alert.alert('Eroare', 'Nu pot porni ascultarea. Verifică permisiunile microfonului.');
        }
    };

    const stopListening = () => {
        if (recognition && isListening) {
            try {
                recognition.stop();
            } catch (error) {
                console.log('Stop listening error:', error);
            }
        }
    };

    useEffect(() => {
        initializeSpeechRecognition();
        return () => {
            if (recognition) {
                recognition.abort();
            }
        };
    }, []);

    return {
        isListening,
        startListening,
        stopListening,
        checkSpeechRecognitionSupport
    };
};
