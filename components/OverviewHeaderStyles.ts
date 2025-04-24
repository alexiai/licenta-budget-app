import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    headerContainer: {
        zIndex: 1000,
        marginLeft: 10,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 10,
        borderRadius: 7,
        overflow: 'hidden',
    },
    switchBtn: {
        width: 95,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#fff3cd',
        alignItems: 'center',
        borderRightWidth: 0.5,
        borderRightColor: '#ccc',
    },
    switchBtnActive: {
        backgroundColor: '#6c488e',
    },
    switchText: {
        fontWeight: 'bold',
        color: '#d2c1ad',
        fontSize: 17,
        letterSpacing: -0.7
    },
});
