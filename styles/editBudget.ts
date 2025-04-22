import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    section: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C2C2C',
        marginTop: 24,
        marginBottom: 8,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 10,
        borderColor: '#E0E0E0',
        borderWidth: 1,
        marginBottom: 8,
    },
    itemText: {
        fontSize: 16,
        color: '#444',
    },
    addSubBtn: {
        marginTop: 6,
        marginBottom: 16,
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignSelf: 'flex-start',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    addSubText: {
        color: '#888',
        fontWeight: '600',
        fontSize: 14,
    },
});
