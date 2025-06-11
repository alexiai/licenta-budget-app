import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert, Image, ScrollView, ImageBackground } from 'react-native';
import { useEffect, useState } from 'react';
import { auth, db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword, deleteUser } from 'firebase/auth';
import { useRouter } from 'expo-router';
import styles from '../../../styles/profile';
import bg from '@assets/bg/profilebackrground.png';
import calendarGood from '@assets/icons/calendarGood.png';
import aiRewards from '@assets/decor/aiRewards.png';

interface Badge {
    id: string;
    name: string;
    emoji: string;
    description: string;
    requirement: number;
    earned: boolean;
    earnedDate?: Date;
}

interface UserProgress {
    completedQuests: string[];
    totalPoints: number;
    badges: Badge[];
    questsCompleted: number;
    currentStreak: number;
    lastCompletedDate?: string;
    level: number;
    xp: number;
}

export default function MyProfileScreen() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState(auth.currentUser);
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState(currentUser?.email || '');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [appNotificationsEnabled, setAppNotificationsEnabled] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [userProgress, setUserProgress] = useState<UserProgress | null>(null);

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
        const user = auth.currentUser;
        if (!user) {
            router.replace('/welcome');
            return;
        }
        setCurrentUser(user);

        const loadUser = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data() as UserData;
                    setName(data.name || '');
                    setSurname(data.surname || '');
                    setEmail(data.email || user.email || '');
                    setNotificationsEnabled(data.notificationsEnabled ?? true);
                    setAppNotificationsEnabled(data.appNotificationsEnabled ?? true);
                }

                // Load user progress and badges
                const progressDoc = await getDoc(doc(db, 'userProgress', user.uid));
                if (progressDoc.exists()) {
                    const progressData = progressDoc.data();
                    setUserProgress({
                        completedQuests: progressData.completedQuests || [],
                        totalPoints: progressData.totalPoints || 0,
                        badges: progressData.badges || [],
                        questsCompleted: progressData.questsCompleted || 0,
                        currentStreak: progressData.currentStreak || 0,
                        lastCompletedDate: progressData.lastCompletedDate,
                        level: progressData.level || 1,
                        xp: progressData.xp || 0
                    });
                } else {
                    // Initialize empty progress if doesn't exist
                    setUserProgress({
                        completedQuests: [],
                        totalPoints: 0,
                        badges: [],
                        questsCompleted: 0,
                        currentStreak: 0,
                        level: 1,
                        xp: 0
                    });
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                Alert.alert('Error', 'Failed to load user data. Please try again.');
            }
        };

        loadUser();
    }, [router]);

    const handleSave = async () => {
        if (!currentUser) return;

        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                name,
                surname,
                email,
                notificationsEnabled,
                appNotificationsEnabled,
                bankConnected: false,
                bankAccountId: null,
                bankConnectedAt: null,
            });

            Alert.alert('Success', 'Profile updated successfully!');
            setIsEditing(false);
        } catch {
            Alert.alert('Error', 'Failed to update profile.');
        }
    };

    const handleDisconnectBank = async () => {
        if (!currentUser) return;
        try {
            await deleteDoc(doc(db, 'bankConnections', currentUser.uid));
            Alert.alert('Disconnected', 'Bank account disconnected successfully.');
        } catch (err) {
            Alert.alert('Error', 'Failed to disconnect bank account.');
        }
    };

    const handlePasswordChange = async () => {
        if (!currentUser || !currentUser.email) return;

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        try {
            // Reauthenticate user
            const credential = EmailAuthProvider.credential(
                currentUser.email,
                currentPassword
            );

            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPassword);

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
        if (!currentUser) return;

        try {
            // First delete user data from Firestore
            await deleteDoc(doc(db, 'users', currentUser.uid));

            // Then delete the user account
            await deleteUser(currentUser);

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

    const earnedBadges = userProgress?.badges.filter(b => b.earned) || [];
    const unearnedBadges = userProgress?.badges.filter(b => !b.earned) || [];

    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>My Profile</Text>

                <View style={styles.avatarContainer}>
                    <Image source={calendarGood} style={styles.avatar} />
                </View>

                {/* Badge Section */}
                {userProgress && (
                    <View style={styles.badgeSection}>
                        <View style={styles.achievementHeader}>
                            <Image source={aiRewards} style={styles.achievementIcon} />
                            <View style={styles.achievementStats}>
                                <View style={styles.achievementRow}>
                                    <Text style={styles.achievementValue}>{userProgress.totalPoints}</Text>
                                    <Text style={styles.achievementLabel}>CarrotCoins</Text>
                                </View>
                                <View style={styles.achievementRow}>
                                    <Text style={styles.achievementValue}>{userProgress.questsCompleted}</Text>
                                    <Text style={styles.achievementLabel}>Quests</Text>
                                </View>
                                <View style={styles.achievementRow}>
                                    <Text style={styles.achievementValue}>{earnedBadges.length}</Text>
                                    <Text style={styles.achievementLabel}>Badges</Text>
                                </View>
                            </View>
                        </View>

                        {earnedBadges.length > 0 && (
                            <View style={styles.earnedBadgesContainer}>
                                <Text style={styles.earnedBadgesTitle}>🏆 Earned Badges</Text>
                                <View style={styles.badgeGrid}>
                                    {earnedBadges.map((badge) => (
                                        <View key={badge.id} style={styles.earnedBadge}>
                                            <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                                            <Text style={styles.badgeName}>{badge.name}</Text>
                                            <Text style={styles.badgeDesc}>{badge.description}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {unearnedBadges.length > 0 && (
                            <View style={styles.upcomingBadgesContainer}>
                                <Text style={styles.upcomingBadgesTitle}>🎯 Upcoming Badges</Text>
                                <View style={styles.badgeGrid}>
                                    {unearnedBadges.slice(0, 3).map((badge) => (
                                        <View key={badge.id} style={styles.unearnedBadge}>
                                            <Text style={[styles.badgeEmoji, styles.unearnedEmoji]}>{badge.emoji}</Text>
                                            <Text style={styles.badgeName}>{badge.name}</Text>
                                            <Text style={styles.badgeRequirement}>Complete {badge.requirement} quests</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}

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
                    <TouchableOpacity
                        style={[styles.itemBtn, styles.bankBtn]}
                        onPress={() => router.push('/bank-connect')}
                    >
                        <Text style={styles.itemBtnText}>Connect Bank Account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.disconnectBtn}
                        onPress={handleDisconnectBank}
                    >
                        <Text style={styles.disconnectBtnText}>Disconnect Bank Account</Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </ImageBackground>
    );
}
