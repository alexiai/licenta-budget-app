
import React from 'react';
import { useRouter } from 'expo-router';
import ReceiptScanner from '../components/ReceiptScanner';

export default function ReceiptScannerScreen(): JSX.Element {
    const router = useRouter();

    const handleBack = () => {
        router.back();
    };

    return <ReceiptScanner onBack={handleBack} />;
}
