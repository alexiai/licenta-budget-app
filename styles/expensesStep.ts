import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#FFF5E0',
    },
    container: {
        padding: 20,
        paddingBottom: 80,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1E1E1E',
        marginBottom: 6,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#7A7A7A',
        textAlign: 'center',
        marginBottom: 20,
    },
    remainingText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 14,
        textAlign: 'center',
    },
    column: {
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    listContent: {
        paddingBottom: 30,
    },
    card: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },
    categoryBox: {
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 6,
        borderRadius: 12,
        backgroundColor: '#FFE082',
    },
    activeCategory: {
        backgroundColor: '#FFD54F',
    },
    catLabel: {
        marginTop: 6,
        fontSize: 14,
        color: '#2C2C2C',
        textAlign: 'center',
    },
    icon: {
        width: 36,
        height: 36,
    },
    input: {
        backgroundColor: '#FFFDF7',
        borderRadius: 12,
        padding: 10,
        fontSize: 14,
        borderWidth: 1.5,
        borderColor: '#FFD366',
        marginTop: 6,
        color: '#2C2C2C',
    },
    button: {
        marginTop: 30,
        backgroundColor: '#F9A825',
        padding: 16,
        borderRadius: 18,
        alignItems: 'center',
    },
    buttonText: {
        color: '#1E1E1E',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
