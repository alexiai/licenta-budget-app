import { View, Text, TextInput, TouchableOpacity, Switch, Alert, Image, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { auth, db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import DropDownPicker from 'react-native-dropdown-picker';
import { useRouter } from 'expo-router';
import styles from '@styles/profile';

export default function MyProfileScreen() {
    const user = auth.currentUser;
    const router = useRouter();

    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState(user?.email || '');
    const [avatar, setAvatar] = useState('https://i.pravatar.cc/150?img=3');

    const [currency, setCurrency] = useState('RON');
    const [currencyOpen, setCurrencyOpen] = useState(false);
    const currencies = [
        { label: 'RON', value: 'RON' },
        { label: 'EUR', value: 'EUR' },
        { label: 'USD', value: 'USD' },
        { label: 'GBP', value: 'GBP' },
        { label: 'JPY', value: 'JPY' },
        { label: 'CHF', value: 'CHF' },
        { label: 'AUD', value: 'AUD' },
        { label: 'CAD', value: 'CAD' },
    ];

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [appNotificationsEnabled, setAppNotificationsEnabled] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            if (!user) return;
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setName(data.name || '');
                setSurname(data.surname || '');
                if (data.currency) setCurrency(data.currency);
                if (data.avatar) setAvatar(data.avatar);
                setNotificationsEnabled(data.notificationsEnabled ?? true);
                setAppNotificationsEnabled(data.appNotificationsEnabled ?? true);
            }
        };
        loadUser();
    }, []);

    const handleSave = async () => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                name,
                surname,
                avatar,
                currency,
                notificationsEnabled,
                appNotificationsEnabled,
            });
            Alert.alert('Profile updated!');
        } catch {
            Alert.alert('Error updating profile.');
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>👤 My Profile</Text>

            <Image source={{ uri: avatar }} style={styles.avatar} />
            <TouchableOpacity style={styles.avatarBtn}>
                <Text style={styles.avatarBtnText}>Change Avatar</Text>
            </TouchableOpacity>

            <TextInput placeholder="First Name" value={name} onChangeText={setName} style={styles.input} />
            <TextInput placeholder="Last Name" value={surname} onChangeText={setSurname} style={styles.input} />
            <TextInput placeholder="Email" value={email} editable={false} style={styles.input} />

            <DropDownPicker
                open={currencyOpen}
                value={currency}
                items={currencies}
                setOpen={setCurrencyOpen}
                setValue={setCurrency}
                placeholder="Select currency"
                style={styles.dropdown}
                dropDownContainerStyle={{ borderRadius: 10 }}
            />

            <Text style={styles.sectionTitle}>🔔 Notifications</Text>
            <View style={styles.switchRow}>
                <Text>General Notifications</Text>
                <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
            </View>
            <View style={styles.switchRow}>
                <Text>App Notifications</Text>
                <Switch value={appNotificationsEnabled} onValueChange={setAppNotificationsEnabled} />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.itemBtn}
                onPress={() => router.push('/support')}
            >
                <Text style={styles.itemBtnText}>Support</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
