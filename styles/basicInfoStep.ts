import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    wrapper: {
        flex: 1,
        width: '100%',
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
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 10,
    },
    button: {
        backgroundColor: '#91483C',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    backButton: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#91483C',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    backButtonText: {
        color: '#91483C',
    },
});
