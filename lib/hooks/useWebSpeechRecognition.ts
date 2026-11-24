// lib/hooks/useWebSpeechRecognition.ts

import { useState, useRef } from 'react';

export default function useWebSpeechRecognition() {
    const recognitionRef = useRef<any>(null);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');

    const startRecognition = () => {
        console.log('🟡 startRecognition called');

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Browserul tău nu suportă Speech Recognition.');
            console.error('⛔ SpeechRecognition API not available in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ro-RO';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            console.log('✅ SpeechRecognition started');
        };

        recognition.onresult = (event: any) => {
            const result = event.results[0][0].transcript;
            console.log('🟢 SpeechRecognition result:', result);
            setTranscript(result);
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error('🔴 Voice error:', event.error);
            if (event.error === 'network') {
                console.warn('🌐 Network error - SpeechRecognition needs internet connection + HTTPS');
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            console.log('🟤 SpeechRecognition ended');
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
            console.log('🚀 recognition.start() called');
            setIsListening(true);
        } catch (e) {
            console.error('🔥 Failed to start recognition:', e);
        }
    };

    return {
        isListening,
        transcript,
        startRecognition,
        reset: () => {
            console.log('🔄 Transcript reset');
            setTranscript('');
        },
    };
}
