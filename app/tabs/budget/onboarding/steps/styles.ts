import { StyleSheet } from 'react-native';

export const unstable_settings = { initialRouteName: 'index' };

export const screenOptions = {
    tabBarStyle: { display: 'none' },
};

export default StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        backgroundColor: '#FFEEDB',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#2C2C2C',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
        color: '#7B7B7B',
    },
    label: {
        marginTop: 15,
        marginBottom: 5,
        color: '#555',
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#FFF',
        borderRadius: 10,
        padding: 12,
        color: '#2C2C2C',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginTop: 6,
    },
    dropdown: {
        backgroundColor: '#FFF',
        borderColor: '#D3D3D3',
        borderRadius: 10,
        marginBottom: 10,
    },
    dropdownContainer: {
        borderColor: '#D3D3D3',
        borderRadius: 12,
    },
    button: {
        marginTop: 30,
        backgroundColor: '#FFD366',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: '#2C2C2C',
        fontWeight: 'bold',
        fontSize: 16,
    },
    sectionTitle: {
        marginTop: 20,
        fontWeight: 'bold',
        fontSize: 16,
        color: '#2C2C2C',
    },
    itemText: {
        color: '#444',
        marginLeft: 8,
        marginVertical: 2,
    },
    categoryTitle: {
        color: '#3A3A3A',
        fontWeight: '600',
        marginTop: 12,
        marginLeft: 4,
    },
    subItemText: {
        color: '#6E6E6E',
        marginLeft: 16,
        fontSize: 14,
    },
    highlightText: {
        color: '#00B894',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 10,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    flatListContent: {
        paddingBottom: 30,
    },
    categoryWrapper: {
        width: '48%',
        alignItems: 'center',
        marginBottom: 20,
    },
    categoryButton: {
        alignItems: 'center',
        padding: 8,
    },
    selected: {
        opacity: 1,
    },
    unselected: {
        opacity: 0.4,
    },
    categoryLabel: {
        color: '#2C2C2C',
        fontSize: 12,
    },
    icon: {
        width: 40,
        height: 40,
        marginBottom: 5,
    },

    // 🎯 Noi stiluri pentru IncomeStep
    iconList: {
        marginVertical: 20,
    },
    iconButton: {
        alignItems: 'center',
        marginRight: 16,
    },
    iconActive: {
        opacity: 1,
    },
    iconInactive: {
        opacity: 0.4,
    },
    iconImage: {
        width: 40,
        height: 40,
        marginBottom: 4,
    },
    iconLabel: {
        fontSize: 12,
        color: '#2C2C2C',
    },
});
