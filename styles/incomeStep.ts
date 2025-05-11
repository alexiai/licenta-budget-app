import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 50,
        paddingBottom: 40,
    },
    title: {
        fontSize: 40,
        fontWeight: '900',
        color: '#6B3E26',
        textAlign: 'center',
        marginBottom: 30,
        fontFamily: 'Fredoka',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    label: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#7C4F29',
        width: 190, // sau cât simți că încap toate frumos
        fontFamily: 'Fredoka',
    },


    icon: {
        width: 32,
        height: 32,
        resizeMode: 'contain',
        marginLeft:10
    },
    input: {
        //flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 10,
        fontSize: 18,
        borderWidth: 2,
        borderColor: '#F7C873',
        color: '#2C2C2C',
        fontFamily: 'Fredoka',
        width: 100, // sau 90, 80, ajustezi cât de mic vrei
        marginLeft:50


    },
    totalText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#7C4F29',
        textAlign: 'center',
        marginVertical: 20,
        fontFamily: 'Fredoka',
    },
    button: {
        marginTop: 10,
        backgroundColor: '#FFA94D',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 5,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 22,
        fontFamily: 'Fredoka',
    },
});
