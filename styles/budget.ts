import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFE8B0',
    },

    fixedHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },

    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',

    },

    title: {
        fontSize: 35,
        fontWeight: '900',
        color: '#91483c',
        fontFamily: 'Fredoka',
        textAlign: 'center',
        marginTop: 110,
    },

    editButton: {
        padding: 6,
    },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',

    },

    card: {
        marginLeft: 20,
        marginRight: 20,
        backgroundColor: '#ffe599',
        padding: 20,
        borderRadius: 18,
        marginBottom: 16,
        borderWidth: 3,
        borderColor: '#eda82f',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 4,
    },

    progressBarContainer: {
        width: '90%',
        height: 14,
        backgroundColor: '#fcd39f',
        borderRadius: 8,
        marginVertical: 10,
        overflow: 'hidden',
        marginLeft: 15
    },

    progressBar: {
        height: '100%',
        backgroundColor: '#80c88f',
        borderRadius: 8,
    },

    cardTitle: {
        fontSize: 20,
        color: '#91483c',
        marginBottom: 6,
        fontFamily: 'Fredoka',
        textAlign: 'center',
        fontWeight: 'bold',
    },

    cardValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#D45920',
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },

    cardSubtitle: {
        fontSize: 16,
        color: '#91483c',
        fontFamily: 'Fredoka',
    },

    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },

    tapToShow: {
        //marginTop: 12,
    },

    chartToggle: {
        textAlign: 'center',
        textDecorationLine: 'underline',
        fontFamily: 'Fredoka',
        fontSize: 14,
        color: '#91483c',
    },

    pieWrapper: {
        width: 140,
        height: 140,
        alignSelf: 'center',
        marginTop: 10,
    },

    pieChart: {
        height: '100%',
        width: '100%',
    },

    section: {
        marginLeft: 20,
        marginRight: 20,
        fontSize: 25,
        fontWeight: 'bold',
        color: '#52366b',
        marginTop: 24,
        //marginBottom: 8,
        fontFamily: 'Fredoka',
    },

    categoryIcon: {
        width: 30,
        height: 30,
        marginRight: 10,
    },

    itemRow: {
        marginLeft: 20,
        marginRight: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#FFF2CC',
        padding: 15,
        borderRadius: 12,
        borderColor: '#eda82f',
        borderWidth: 2,
        marginBottom: 10,
    },

    itemText: {
        fontSize: 18,
        color: '#52366b',
        fontFamily: 'Fredoka',
        flex: 1,
    },

    itemAmount: {
        fontSize: 18,
        fontWeight: '600',
        color: '#D45920',
        fontFamily: 'Fredoka',
    },

    chartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },

    legendBox: {
        marginLeft: 8,
        justifyContent: 'center',
    },

    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },

    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },

    legendText: {
        fontSize: 14,
        fontFamily: 'Fredoka',
        color: '#52366b',
    },

    legendPercent: {
        fontWeight: 'bold',
        marginRight: 4,
    },
});
