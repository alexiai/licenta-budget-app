import { View, Text, Linking, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function SupportScreen() {
    const contactInfo = [
        { label: 'Email', value: 'cojanalexia@yahoo.com', link: 'mailto:cojanalexia@yahoo.com' },
        { label: 'Phone', value: '+40 754552481', link: 'tel:+40754552481' },
        { label: 'Instagram', value: '@alexia_ilaria', link: 'https://instagram.com/alexia_ilaria' },
        { label: 'LinkedIn', value: 'Alexia Cojan', link: 'https://www.linkedin.com/in/alexia-ilaria-cojan-122bba2bb/' },
        { label: 'GitHub', value: 'alexiai', link: 'https://github.com/alexiai' },
    ];

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>📞 Contact Us</Text>
            <Text style={styles.subtitle}>If you have any questions or need help, feel free to contact us via the details below:</Text>

            {contactInfo.map((item, index) => (
                <TouchableOpacity key={index} style={styles.item} onPress={() => Linking.openURL(item.link)}>
                    <Text style={styles.label}>{item.label}:</Text>
                    <Text style={styles.link}>{item.value}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        backgroundColor: '#fffdf6',
        flexGrow: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    item: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#f8f1e4',
        borderRadius: 10,
    },
    label: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#444',
    },
    link: {
        fontSize: 16,
        color: '#2980b9',
        marginTop: 4,
    },
});
