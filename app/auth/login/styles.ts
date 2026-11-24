import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    bg: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
    },
    overlay: {
        padding: 20, // Padding-ul intern pentru formular
        paddingBottom: 70,
        borderRadius: 30,
        marginHorizontal: 10,
        justifyContent: 'flex-start',
        marginTop: 430, // Muta formularul mai sus
    },
    input: {
        backgroundColor: '#FFF7F0',
        padding: 14,
        borderRadius: 14,
        borderWidth: 5,
        borderColor: '#D6A86E',
        marginBottom: 16,
        fontSize: 20,
        color: '#2C2C2C',
        fontFamily: 'Fredoka',
        width: '95%',  // Dimensiune mai mică pentru email
        marginLeft: 10,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%', // Lățime mai mare pentru parola
    },
    eyeIcon: {
        position: 'absolute',
        right: 30,
        top: 20,
    },
    button: {
        backgroundColor: '#F9C784',
        paddingVertical: 7,
        borderRadius: 20,
        alignItems: 'center',
        width: '45%',  // Mărim butonul pentru a fi mai mic
        borderWidth: 3,
        borderColor: '#623317',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
        marginLeft: 12,
    },
    buttonText: {
        color: '#000',
        fontFamily: 'Fredoka',
        fontWeight: 'bold',
        fontSize: 20,
    },
    error: {
        color: '#D63031',
        textAlign: 'center',
        marginBottom: 12,
        fontWeight: '900',
        fontFamily: 'Fredoka',
    },
    link: {
        color: '#6C5CE7',
        textAlign: 'center',
        marginTop: 80, // Mai mult spațiu între buton și link
        fontWeight: 'bold',
        fontSize: 15, // Font mai mic pentru a încadra textul pe două linii
        fontFamily: 'Fredoka',
        marginLeft: 20,
    },
    signupContainer: {
        marginTop: 10, // 🆙 Spațiu față de butonul login
        //alignItems: 'center',
        marginLeft:20
    },

    linkText: {
        color: '#000000',
        fontWeight: 'bold',
        fontSize: 15,
        fontFamily: 'Fredoka',
    },

    signupLink: {
        color: '#6C5CE7',
        fontWeight: 'bold',
        fontSize: 17,
        fontFamily: 'Fredoka',
        textDecorationLine: 'underline',
        marginTop: 5,
    },

});
