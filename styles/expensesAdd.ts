import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: '#fff8e7',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#d00000',
        textAlign: 'center',
        marginBottom: 24,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginVertical: 8,
    },
    input: {
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 12,
        borderColor: '#ff8800',
        borderWidth: 2,
        marginBottom: 16,
        fontSize: 16,
        color: '#333',
    },
    dropdown: {
        borderColor: '#ff8800',
        borderWidth: 2,
        borderRadius: 12,
        marginBottom: 16,
    },
    subcategoryWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    subcategoryButton: {
        backgroundColor: '#eee',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#bbb',
    },
    subcategorySelected: {
        backgroundColor: '#ff8800',
        borderColor: '#d00000',
    },
    subcategoryText: {
        fontSize: 14,
        color: '#333',
    },
    subcategoryTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#ff006e',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 5,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    subList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    subItem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f0e68c',
        borderRadius: 10,
    },
    subItemActive: {
        backgroundColor: '#ffcc00',
    },
    subItemText: {
        fontSize: 14,
        color: '#333',
    },

});
