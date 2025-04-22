import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    headerContainer: {
        marginBottom: 16,
        zIndex: 1000,
    },
    dropdown: {
        marginBottom: 12,
        zIndex: 1001,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    switchBtn: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#eee',
        alignItems: 'center',
    },
    switchBtnActive: {
        backgroundColor: '#6c5ce7',
    },
    switchText: {
        fontWeight: 'bold',
        color: '#fff',
    },
});
