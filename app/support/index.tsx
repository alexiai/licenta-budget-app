import { View, Text, Linking, ScrollView, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import bg from '@assets/bg/background2.png';

export default function SupportScreen() {
    const router = useRouter();

    const contactInfo = [
        { label: 'Email', value: 'cojanalexia@yahoo.com', link: 'mailto:cojanalexia@yahoo.com', icon: 'mail' },
        { label: 'Phone', value: '+40 754552481', link: 'tel:+40754552481', icon: 'phone' },
        { label: 'Instagram', value: '@alexia_ilaria', link: 'https://instagram.com/alexia_ilaria', icon: 'instagram' },
        { label: 'LinkedIn', value: 'Alexia Cojan', link: 'https://linkedin.com/in/alexia-ilaria-cojan-122bba2bb', icon: 'linkedin' },
        { label: 'GitHub', value: 'alexiai', link: 'https://github.com/alexiai', icon: 'github' },
    ];

    const faqItems = [
        {
            question: "How do I reset my budget?",
            answer: "Go to Budget settings and select 'Reset Budget' option."
        },
        {
            question: "Can I change my currency?",
            answer: "Yes, you can change it anytime in your Profile settings."
        },
        {
            question: "Where can I see my spending history?",
            answer: "Check the Calendar or Reports section for detailed history."
        }
    ];

    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.push('/tabs/profile')}
                >
                    <Feather name="arrow-left" size={24} color="#91483c" />
                    <Text style={styles.backButtonText}>Back to Profile</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Contact Support</Text>
                <Text style={styles.subtitle}>If you have any questions or need help, feel free to contact us:</Text>

                {/* Contact Cards */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>📞 Contact Information</Text>
                    {contactInfo.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.contactCard}
                            onPress={() => Linking.openURL(item.link)}
                        >
                            <View style={styles.contactIcon}>
                                <Feather name={item.icon} size={20} color="#d5790d" />
                            </View>
                            <View style={styles.contactTextContainer}>
                                <Text style={styles.contactLabel}>{item.label}</Text>
                                <Text style={styles.contactValue}>{item.value}</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#d5790d" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* FAQ Section */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>❓ Frequently Asked Questions</Text>
                    {faqItems.map((item, index) => (
                        <View key={index} style={styles.faqCard}>
                            <Text style={styles.faqQuestion}>{item.question}</Text>
                            <Text style={styles.faqAnswer}>{item.answer}</Text>
                        </View>
                    ))}
                </View>

                {/* Support Hours */}
                <View style={styles.hoursCard}>
                    <Text style={styles.hoursTitle}>🕒 Support Hours</Text>
                    <Text style={styles.hoursText}>Monday - Friday: 9:00 - 18:00</Text>
                    <Text style={styles.hoursText}>Saturday: 10:00 - 14:00</Text>
                    <Text style={styles.hoursText}>Sunday: Closed</Text>
                </View>
            </ScrollView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        padding: 10,
        alignSelf: 'flex-start',
    },
    backButtonText: {
        fontFamily: 'Fredoka',
        fontSize: 16,
        color: '#91483c',
        marginLeft: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        fontFamily: 'Fredoka',
        color: '#91483c',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Fredoka',
        color: '#52366b',
        textAlign: 'center',
        marginBottom: 30,
    },
    sectionContainer: {
        backgroundColor: '#fff5d6',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#d5790d',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
        color: '#52366b',
        marginBottom: 15,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffe8b0',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#d5790d',
    },
    contactIcon: {
        marginRight: 15,
    },
    contactTextContainer: {
        flex: 1,
    },
    contactLabel: {
        fontFamily: 'Fredoka',
        fontSize: 14,
        color: '#52366b',
        marginBottom: 2,
    },
    contactValue: {
        fontFamily: 'Fredoka',
        fontSize: 16,
        color: '#2d3436',
        fontWeight: '600',
    },
    faqCard: {
        backgroundColor: '#ffe8b0',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#d5790d',
    },
    faqQuestion: {
        fontFamily: 'Fredoka',
        fontSize: 16,
        color: '#2d3436',
        fontWeight: '600',
        marginBottom: 5,
    },
    faqAnswer: {
        fontFamily: 'Fredoka',
        fontSize: 14,
        color: '#52366b',
    },
    hoursCard: {
        backgroundColor: '#fff5d6',
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: '#d5790d',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    hoursTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
        color: '#52366b',
        marginBottom: 10,
    },
    hoursText: {
        fontFamily: 'Fredoka',
        fontSize: 16,
        color: '#2d3436',
        marginBottom: 5,
    },
});