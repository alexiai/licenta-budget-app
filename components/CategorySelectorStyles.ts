import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    formGroup: {
        marginBottom: 20,
    },
    categoryScroll: {
        flexGrow: 0,
        marginBottom: 10,
    },
    categoryButton: {
        backgroundColor: '#ffe599',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 10,
        borderWidth: 2,
        borderColor: '#eda82f',
    },
    categoryButtonSelected: {
        backgroundColor: '#eda82f',
    },
    categoryButtonText: {
        color: '#52366b',
        fontSize: 16,
        fontFamily: 'Fredoka',
    },
    categoryButtonTextSelected: {
        color: '#fff',
    },
    backToCategories: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    backToCategoriesText: {
        color: '#91483c',
        fontSize: 16,
        marginLeft: 5,
        fontFamily: 'Fredoka',
    },
}); 