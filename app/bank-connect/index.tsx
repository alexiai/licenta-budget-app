import { View, ScrollView, Text, TextInput, TouchableOpacity, Alert, Platform, ImageBackground } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import WebView from 'react-native-webview';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import background from '@assets/bg/backgroundbankconnect2.png';

export default function BankConnect() {
    const router = useRouter();
    const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);
    const [filteredBanks, setFilteredBanks] = useState<typeof banks>([]);
    const [search, setSearch] = useState('');
    const [connectUrl, setConnectUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchBanks = async () => {
        try {
            const res = await axios.get('http://192.168.0.1:5000/api/banks');
            setBanks(res.data);
            setFilteredBanks(res.data);
        } catch (err) {
            Alert.alert('Error', 'Could not load banks.');
            console.error(err);
        }
    };

    const handleConnect = async (institutionId: string) => {
        setLoading(true);
        try {
            const response = await axios.post('http://192.168.0.1:5000/api/connect-gocardless', {
                institution_id: institutionId,
            });

            const url = response.data?.link;
            if (!url) throw new Error('Missing redirect URL');

            if (Platform.OS === 'web') {
                window.location.href = url;
            } else {
                setConnectUrl(url);
            }
        } catch (err: any) {
            console.error('❌ Error connecting GoCardless:', err.response?.data || err.message);
            Alert.alert('Error', 'Failed to connect to bank.');
        } finally {
            setLoading(false);
        }
    };

    const handleWebViewNavigationStateChange = (navState: any) => {
        const { url } = navState;
        if (url.includes('/tabs/overview/list')) {
            setConnectUrl(null);
            router.push('/tabs/overview/list');
        }
    };

    const handleSearch = (text: string) => {
        setSearch(text);
        const filtered = banks.filter(bank =>
            bank.name.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredBanks(filtered);
    };

    useEffect(() => {
        fetchBanks();
    }, []);

    if (connectUrl && Platform.OS !== 'web') {
        return (
            <WebView
                source={{ uri: connectUrl }}
                style={{ flex: 1 }}
                onNavigationStateChange={handleWebViewNavigationStateChange}
                startInLoadingState
                javaScriptEnabled
                domStorageEnabled
            />
        );
    }

    return (
        <ImageBackground source={background} style={styles.container} resizeMode="cover">
            <TouchableOpacity
                onPress={() => router.push('/tabs/profile')}
                style={styles.backButton}
            >
                <Ionicons name="arrow-back" size={28} color="#91483c" />
            </TouchableOpacity>

            <TextInput
                placeholder="Search bank..."
                placeholderTextColor="#91483c"
                value={search}
                onChangeText={handleSearch}
                style={styles.searchInput}
            />

            <ScrollView style={{ flex: 1, marginTop: 20 }}>
                {filteredBanks.length === 0 ? (
                    <Text style={styles.noResult}>No bank found.</Text>
                ) : (
                    <View style={{ gap: 12, paddingHorizontal: 8 }}>
                        {filteredBanks.map(bank => (
                            <TouchableOpacity
                                key={bank.id}
                                style={[styles.connectBtn, loading && styles.connectBtnDisabled]}
                                onPress={() => handleConnect(bank.id)}
                                disabled={loading}
                            >
                                <Text style={styles.connectBtnText}>
                                    {loading ? 'Connecting...' : `Connect to ${bank.name}`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </ImageBackground>
    );
}

const styles = {
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 20,
        backgroundColor: '#FFE8B0',
        marginBottom: 60,
    },
    backButton: {
        position: 'absolute',
        top: 48,
        left: 10,
        zIndex: 10,
        padding: 6,
    },
    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: 'Fredoka',
        color: '#91483c',
        borderColor: '#eda82f',
        borderWidth: 2,
        alignSelf: 'flex-end', // poziționează spre dreapta
        width: '58%',          // mai aproape de mâna iepurașului
        marginTop: 20,
    },
    noResult: {
        fontFamily: 'Fredoka',
        fontSize: 18,
        textAlign: 'center',
        marginTop: 50,
        color: '#91483c',
    },
    connectBtn: {
        backgroundColor: '#ffe599',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 7,
        borderColor: '#eda82f',
        borderWidth: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        marginTop:5,
        marginLeft:5,
        marginRight:5

    },
    connectBtnDisabled: {
        opacity: 0.6,
    },
    connectBtnText: {
        fontFamily: 'Fredoka',
        fontSize: 18,
        color: '#91483c',
        textAlign: 'center',
    },
};
