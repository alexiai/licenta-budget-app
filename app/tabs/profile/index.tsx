import { View, Text, TextInput, TouchableOpacity, Switch, Alert, Image, ScrollView, ImageBackground } from 'react-native';
import { useEffect, useState } from 'react';
import { auth, db } from '@lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword, deleteUser } from 'firebase/auth';
import { useRouter } from 'expo-router';
import styles from '@styles/profile';
import bg from '@assets/bg/background2.png';
import calendarGood from '@assets/icons/calendarGood.png';


export default function MyProfileScreen() {
    const user = auth.currentUser;
    const router = useRouter();

    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState(user?.email || '');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [appNotificationsEnabled, setAppNotificationsEnabled] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // Password change state
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Delete account state
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    interface UserData {
        name: string;
        surname: string;
        email: string;
        notificationsEnabled: boolean;
        appNotificationsEnabled: boolean;
        createdAt?: string;
    }

    useEffect(() => {
        const loadUser = async () => {
            if (!user) return;
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data() as UserData;
                setName(data.name || '');
                setSurname(data.surname || '');
                setEmail(data.email || user?.email || '');
                setNotificationsEnabled(data.notificationsEnabled ?? true);
                setAppNotificationsEnabled(data.appNotificationsEnabled ?? true);
            }
        };
        loadUser();
    }, [user]);


    const handleSave = async () => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                name,
                surname,
                notificationsEnabled,
                appNotificationsEnabled,
            });
            Alert.alert('Success', 'Profile updated successfully!');
            setIsEditing(false);
        } catch {
            Alert.alert('Error', 'Failed to update profile.');
        }
    };

    const handlePasswordChange = async () => {
        if (!user || !user.email) return;

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        try {
            // Reauthenticate user
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );

            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);

            Alert.alert('Success', 'Password changed successfully');
            setShowPasswordChange(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            Alert.alert('Error', 'Failed to change password. Please check your current password.');
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;

        try {
            // First delete user data from Firestore
            await deleteDoc(doc(db, 'users', user.uid));

            // Then delete the user account
            await deleteUser(user);

            Alert.alert('Account deleted', 'Your account has been successfully deleted');
            router.replace('/welcome');
        } catch (error) {
            Alert.alert('Error', 'Failed to delete account. Please reauthenticate and try again.');
        }
    };

    const handleLogout = async () => {
        await auth.signOut();
        router.replace('/welcome');
    };

    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>My Profile</Text>

                <View style={styles.avatarContainer}>
                    <Image source={calendarGood} style={styles.avatar} />
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.nameHeader}>
                        <Text style={styles.nameText}>
                            {name} {surname}
                        </Text>
                        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                            <Text style={styles.editButton}>
                                {isEditing ? 'Cancel' : 'Edit'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {isEditing ? (
                        <>
                            <TextInput
                                placeholder="First Name"
                                value={name}
                                onChangeText={setName}
                                style={styles.input}
                                placeholderTextColor="#999"
                            />
                            <TextInput
                                placeholder="Last Name"
                                value={surname}
                                onChangeText={setSurname}
                                style={styles.input}
                                placeholderTextColor="#999"
                            />
                        </>
                    ) : (
                        <View style={styles.infoContainer}>
                            <Text style={styles.infoLabel}>First Name:</Text>
                            <Text style={styles.infoValue}>{name}</Text>

                            <Text style={styles.infoLabel}>Last Name:</Text>
                            <Text style={styles.infoValue}>{surname}</Text>
                        </View>
                    )}

                    <View style={styles.infoContainer}>
                        <Text style={styles.infoLabel}>Email:</Text>
                        <Text style={styles.infoValue}>{email}</Text>
                    </View>

                    {isEditing && (
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                        </TouchableOpacity>
                    )}

                    {!showPasswordChange ? (
                        <TouchableOpacity
                            style={styles.changePasswordBtn}
                            onPress={() => setShowPasswordChange(true)}
                        >
                            <Text style={styles.changePasswordText}>Change Password</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.passwordChangeContainer}>
                            <TextInput
                                placeholder="Current Password"
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                style={styles.input}
                                secureTextEntry
                                placeholderTextColor="#999"
                            />
                            <TextInput
                                placeholder="New Password"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                style={styles.input}
                                secureTextEntry
                                placeholderTextColor="#999"
                            />
                            <TextInput
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                style={styles.input}
                                secureTextEntry
                                placeholderTextColor="#999"
                            />
                            <View style={styles.passwordButtons}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => {
                                        setShowPasswordChange(false);
                                        setCurrentPassword('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    }}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.savePasswordBtn}
                                    onPress={handlePasswordChange}
                                >
                                    <Text style={styles.savePasswordBtnText}>Save Password</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>General Notifications</Text>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={notificationsEnabled ? "#f5dd4b" : "#f4f3f4"}
                        />
                    </View>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>App Notifications</Text>
                        <Switch
                            value={appNotificationsEnabled}
                            onValueChange={setAppNotificationsEnabled}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={appNotificationsEnabled ? "#f5dd4b" : "#f4f3f4"}
                        />
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

                    {!showDeleteConfirmation ? (
                        <TouchableOpacity
                            style={styles.deleteAccountBtn}
                            onPress={() => setShowDeleteConfirmation(true)}
                        >
                            <Text style={styles.deleteAccountText}>Delete Account</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.deleteConfirmationContainer}>
                            <Text style={styles.deleteConfirmationText}>Are you sure you want to delete your account?</Text>
                            <View style={styles.deleteButtons}>
                                <TouchableOpacity
                                    style={styles.cancelDeleteBtn}
                                    onPress={() => setShowDeleteConfirmation(false)}
                                >
                                    <Text style={styles.cancelDeleteBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.confirmDeleteBtn}
                                    onPress={handleDeleteAccount}
                                >
                                    <Text style={styles.confirmDeleteBtnText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ImageBackground>
    );
}
