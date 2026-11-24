import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        position: 'relative',
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        marginLeft: -15,
    },
    image: {
        width: 150,
        height: 150,
        marginRight: 10,
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: -15,
        width: 165,
        height: 165,
        backgroundColor: 'rgba(255, 232, 176, 0.3)',
        borderRadius: 82.5,
    },
    headerText: {
        flex: 1,
        marginLeft: 10,
    },
    // ... rest of the styles stay the same ...
}); 