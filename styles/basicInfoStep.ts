import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    wrapper: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 50, // mai sus
        paddingBottom: 40,
    },

    bgImage: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: 40,
        fontWeight: '900',
        color: '#6B3E26',
        marginBottom: 20,
        marginTop: 50,
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
    label: {
        fontSize: 19,
        fontWeight: 'bold',
        color: '#7C4F29',
        marginTop: 18,
        marginBottom: 6,
        fontFamily: 'Fredoka',
    },
    input: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 18,
        fontSize: 18,
        borderWidth: 2,
        borderColor: '#F7C873',
        color: '#2C2C2C',
        fontFamily: 'Fredoka',
    },
    typeButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    typeButton: {
        backgroundColor: '#FFF3DC',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#F7C873',
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    typeButtonSelected: {
        backgroundColor: '#FFD796',
    },
    typeButtonText: {
        fontSize: 18,
        fontFamily: 'Fredoka',
        color: '#5B3A1C',
    },
    dropdown: {
        backgroundColor: '#FFFFFF',
        borderColor: '#FFDA7B',
        borderRadius: 14,
    },
    dropdownContainer: {
        borderColor: '#FFDA7B',
        borderRadius: 14,
    },
    button: {
        marginTop: 30,
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
        fontSize: 25,
        fontFamily: 'Fredoka',
    },
});
