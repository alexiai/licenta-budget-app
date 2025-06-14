import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    wrapper: {
        flex: 1,
        width: '100%',
    },
    container: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 50,
        paddingBottom: 40,
    },
    title: {
        fontSize: 40,
        fontWeight: '900',
        color: '#6B3E26',
        marginBottom: 10,
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
    subtitle: {
        fontSize: 16,
        color: '#91483C',
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'Fredoka',
    },
    remainingText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'Fredoka',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
    },
    card: {
        flex: 1,
    },
    categoryBox: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#F7C873',
        marginBottom: 8,
    },
    activeCategory: {
        backgroundColor: '#FFF3DC',
        borderColor: '#91483C',
    },
    icon: {
        width: 32,
        height: 32,
        marginBottom: 8,
    },
    catLabel: {
        fontSize: 14,
        color: '#5B3A1C',
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
    input: {
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#F7C873',
        color: '#5B3A1C',
        fontFamily: 'Fredoka',
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
