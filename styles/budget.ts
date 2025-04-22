import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        backgroundColor: '#FFEEDB', // crem pastel
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    periodHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF2CC',
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 20,
    },
    navArrow: {
        fontSize: 24,
        color: '#333',
        fontWeight: 'bold',
        marginHorizontal: 16,
    },
    periodText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    card: {
        backgroundColor: '#FFF2CC',
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 14,
        color: '#555',
        marginBottom: 6,
    },
    cardValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#00B894',
        textAlign: 'center',
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 6,
    },
    chartContainer: {
        marginTop: 16,
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    chartRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    chartLabel: {
        fontSize: 14,
        color: '#444',
    },
    chartAmount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
    },
    section: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C2C2C',
        marginTop: 24,
        marginBottom: 8,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
