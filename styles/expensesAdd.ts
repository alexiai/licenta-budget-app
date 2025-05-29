import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    background: {
        flex: 1,
        padding: 20,
    },
    container: {
        paddingBottom: 120,
        paddingHorizontal:28,
    },
    title: {
        fontSize: 45,
        fontWeight: 'bold',
        color: '#6A4C93',
        fontFamily: 'Fredoka',
        textAlign: 'center',
        marginBottom: 24,
    },
    input: {
        backgroundColor: '#FFF2D8',
        borderRadius: 18,
        padding: 16,
        fontSize: 19,
        fontFamily: 'Fredoka',
        marginBottom: 16,
        marginLeft:4,
        marginRight:4,
    },
    datePickerContainer: {
        marginBottom: 16,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 2,
    },



    subtitle: {
        fontSize: 25,
        fontFamily: 'Fredoka',
        color: '#3D405B',
        marginBottom: 8,
        marginTop: 8,
        marginLeft:10,
        marginRight: 10,
        fontWeight: "500"
    },
    dropdown: {
        borderColor: '#E07A5F',
        borderRadius: 19,
        backgroundColor: '#FFF2D8',
        marginBottom: 16,
    },
    dropdownContainer: {
        borderRadius: 19,
        backgroundColor: '#FFF2D8',
        borderColor: '#E07A5F',
    },
    subList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
        gap:2,
    },
    subItem: {
        backgroundColor: '#FDF6EC',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E07A5F',
        marginRight: 8,
        marginBottom: 8,
    },
    subItemActive: {
        backgroundColor: '#E07A5F',
    },
    subItemText: {
        fontFamily: 'Fredoka',
        fontSize:18,
        color: '#3D405B',
    },
    subItemTextActive: {
        color: '#fff',
    },
    button: {
        backgroundColor: '#E07A5F',
        borderRadius: 28,
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 23,
        fontWeight: '500',
        color: '#fff',
        fontFamily: 'Fredoka',
    },
    formContainer: {
        marginHorizontal: 50,
    },

});
