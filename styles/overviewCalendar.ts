import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#FFF7ED',
    },
    title: {
        fontSize: 28,
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#D2691E',
        fontFamily: 'serif',
    },
    legend: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#FFEFDA',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    legendIcon: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    legendText: {
        fontSize: 14,
        color: '#444',
    },
});
