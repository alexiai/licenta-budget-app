import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8E0',
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1C1C1C',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#7B7B7B',
        textAlign: 'center',
        marginBottom: 20,
    },
    iconList: {
        marginVertical: 24,
    },
    iconButton: {
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        padding: 10,
        backgroundColor: '#FFF0C8',
        borderRadius: 14,
    },
    iconActive: {
        borderWidth: 2,
        borderColor: '#F9A825',
    },
    iconInactive: {
        opacity: 0.6,
    },
    iconImage: {
        width: 40,
        height: 40,
        marginBottom: 4,
    },
    iconLabel: {
        fontSize: 12,
        color: '#333',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 2,
        borderColor: '#FFD366',
        color: '#2C2C2C',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#FFBC42',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        marginVertical: 10,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E1E1E',
    },
    label: {
        marginTop: 14,
        marginBottom: 4,
        fontSize: 14,
        color: '#555',
        fontWeight: 'bold',
    },
    itemText: {
        marginLeft: 12,
        color: '#444',
        marginBottom: 4,
    },
});
