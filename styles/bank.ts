
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
        lineHeight: 24,
    },
    connectBtn: {
        backgroundColor: '#0047BB',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    connectBtnDisabled: {
        opacity: 0.7,
    },
    connectBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
