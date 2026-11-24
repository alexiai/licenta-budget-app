import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    backButton: {
        padding: 6,
    },
    editButton: {
        padding: 6,
        borderRadius: 16,
        backgroundColor: '#ffe599',
        borderWidth: 2,
        borderColor: '#eda82f',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#91483c',
        fontFamily: 'Fredoka',
        textAlign: 'center',
        flex: 1,
    },
    form: {
        flex: 1,
        paddingHorizontal: 5,
    },
    formGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#91483c',
        marginBottom: 6,
        fontFamily: 'Fredoka',
    },
    input: {
        backgroundColor: '#ffe599',
        borderWidth: 2,
        borderColor: '#eda82f',
        borderRadius: 10,
        padding: 10,
        fontSize: 15,
        color: '#52366b',
        fontFamily: 'Fredoka',
    },
    inputText: {
        fontSize: 15,
        color: '#52366b',
        fontFamily: 'Fredoka',
    },
    disabledInput: {
        opacity: 0.7,
        backgroundColor: '#fff2cc',
    },
    saveButton: {
        backgroundColor: '#F56C3D',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 30,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Fredoka',
    },
}); 