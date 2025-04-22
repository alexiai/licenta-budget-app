import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF7F0',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#8E44AD',
    marginBottom: 16,
    textAlign: 'center',
  },
  item: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderColor: '#A29BFE',
  },
  category: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  amount: {
    fontSize: 16,
    color: '#E74C3C',
    marginTop: 4,
  },
  date: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8E44AD',
    paddingVertical: 14,
    borderRadius: 14,
    position: 'absolute',
    bottom: 24,
    right: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
