import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFEEDB', // fond crem retro, uniform cu restul aplicației
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#2C2C2C',
        textAlign: 'center',
        marginBottom: 30,
    },
    input: {
        backgroundColor: '#FFF',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 16,
        fontSize: 16,
        color: '#2C2C2C',
    },
    button: {
        backgroundColor: '#FFD366',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    buttonText: {
        color: '#2C2C2C',
        fontWeight: 'bold',
        fontSize: 16,
    },
    error: {
        color: '#D63031',
        textAlign: 'center',
        marginBottom: 12,
        fontWeight: '600',
    },
    link: {
        color: '#6C5CE7',
        textAlign: 'center',
        marginTop: 18,
        fontWeight: 'bold',
        fontSize: 15,
    },
});
