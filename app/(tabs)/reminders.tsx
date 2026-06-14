import { View, Text, StyleSheet } from 'react-native';
export default function Screen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>À venir</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, color: '#64748B' },
});
