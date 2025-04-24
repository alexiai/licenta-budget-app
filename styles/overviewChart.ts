// overviewChart.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFE8B0',
        padding: 20,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        fontFamily: 'Fredoka',
        color: '#91483c',
        textAlign: 'center',
        marginBottom: 4,
    },
    balance: {
        fontSize: 22,
        fontWeight: '600',
        fontFamily: 'Fredoka',
        color: '#cf6b04',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.7,
    },
    legendBox: {
        marginLeft: 10,
        flex: 1,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
        flexWrap: 'wrap',
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    legendText: {
        fontSize: 17,
        fontFamily: 'Fredoka',
        color: '#3D405B',
        fontWeight: '500',
    },
    legendPercent: {
        fontWeight: '600',
        color: '#3D405B',
    },
    insightsScroll: {
        flex: 1,
    },

    ////////////////insights///////////////////
    detailsBox: {
        backgroundColor: '#ffe599',
        borderRadius: 18,
        borderWidth: 4,
        borderColor: '#eda82f',
        paddingVertical: 15,
        paddingHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        marginLeft: 22,
        marginRight: 22,
    },
    insightTitle: {
        fontSize: 23,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
        color: '#52366b',
    },
    subcategoryBox: {
        marginBottom: 2,
    },
    subcategoryText: {
        fontSize: 20,
        fontWeight: '600',
        fontFamily: 'Fredoka',
        color: '#3D405B',
        marginTop: 6,
    },
    expenseBox: {
        backgroundColor: 'rgba(237,168,47,0.37)',
        borderRadius: 14,
        padding: 10,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#eda82f',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
        marginRight: 5,
        marginLeft: 5
    },
    expenseDate: {
        fontSize: 15,
        color: '#999',
        marginBottom: 4,
        fontFamily: 'Fredoka',
    },
    expenseDetail: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expenseNote: {
        fontSize: 19,
        fontWeight: '500',
        fontFamily: 'Fredoka',
        color: '#52366b',
        flexShrink: 1,
        marginRight: 10,
    },
    amountBlock: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    carrotIcon: {
        width: 18,
        height: 18,
        marginRight: 4,
    },
    amount: {
        fontSize: 17,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
        color: '#D45920',
    },
});
