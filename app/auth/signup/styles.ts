import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    bg: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
    },
    overlay: {
        padding: 24,
        borderRadius: 30,
        marginHorizontal: 10,
        justifyContent: 'flex-start',
        marginTop: 320,
    },
    input: {
        backgroundColor: '#FFF7F0',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 14,
        borderWidth: 4,
        borderColor: '#D6A86E',
        fontSize: 18,
        color: '#2C2C2C',
        fontFamily: 'Fredoka',
        marginBottom: 13,
        width: '95%',
        marginLeft: 10,

    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eyeIcon: {
        position: 'absolute',
        right: 20,
        top: 18,
    },
    error: {
        color: '#D63031',
        textAlign: 'center',
        marginBottom: 14,
        fontWeight: '600',
        fontSize: 16,
        fontFamily: 'Fredoka',
    },
    button: {
        backgroundColor: '#F9C784',
        paddingVertical: 5,
        borderRadius: 20,
        alignItems: 'center',
        width: '43%',
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
        fontWeight: 'bold',
        fontSize: 18,
        fontFamily: 'Fredoka',
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
    },
    linkText: {
        color: '#000000',
        fontSize: 15,
        fontWeight: "bold",
        fontFamily: 'Fredoka',
    },
    signupLink: {
       // color: '#6C5CE7',
        //fontFamily: 'Fredoka',
        //fontWeight: 'bold',
        //fontSize: 16,
        marginLeft: 5,
    },
    signupLinkText: {
        color: '#D5790D',
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.7,
    },
});
