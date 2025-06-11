import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 80,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#6B3E26',
        textAlign: 'center',
        marginBottom: 10,
        fontFamily: 'Fredoka',
    },
    subtitle: {
        fontSize: 17,
        color: '#7C4F29',
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'Fredoka',
    },
    remainingText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 25,
        fontFamily: 'Fredoka',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 14,
    },
    card: {
        width: '48%', // în loc de flex: 1
        backgroundColor: '#FFF',
        borderRadius: 18,
        padding: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
        alignSelf: 'flex-start', // împiedică forțarea înălțimii egale
    },

    categoryBox: {
        alignItems: 'center',
        backgroundColor: '#FFE49D',
        borderRadius: 14,
        paddingVertical: 12,
        marginBottom: 8,
    },
    activeCategory: {
        backgroundColor: '#FFD366',
    },
    catLabel: {
        marginTop: 6,
        fontSize: 16,
        fontFamily: 'Fredoka',
        color: '#5B3A1C',
        textAlign: 'center',
    },
    icon: {
        width: 38,
        height: 38,
        resizeMode: 'contain',
    },
    input: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontSize: 16,
        borderWidth: 2,
        borderColor: '#F7C873',
        color: '#2C2C2C',
        fontFamily: 'Fredoka',
        marginBottom: 6,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
        gap: 16,
    },
    button: {
        flex: 1,
        backgroundColor: '#FFA94D',
        padding: 16,
        borderRadius: 22,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 5,
    },
    backButton: {
        backgroundColor: '#FFE49D',
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 22,
        fontFamily: 'Fredoka',
    },
    backButtonText: {
        color: '#6B3E26',
    },
});
