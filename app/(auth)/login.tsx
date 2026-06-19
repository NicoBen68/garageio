import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/colors';

export default function LoginScreen() {
  const c = useColors();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Remplis tous les champs.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Erreur de connexion', error.message);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        <View style={styles.header}>
          <Text style={styles.logo}>🚗</Text>
          <Text style={[styles.title, { color: c.textPrimary }]}>GarageIO</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>Ton carnet d'entretien intelligent</Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]}
            placeholder="tu@email.com"
            placeholderTextColor={c.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>Mot de passe</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]}
            placeholder="••••••••"
            placeholderTextColor={c.textMuted}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Se connecter</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.textMuted }]}>Pas encore de compte ? </Text>
          <Link href="/(auth)/register">
            <Text style={styles.footerLink}>S'inscrire</Text>
          </Link>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  inner:          { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 32 },
  header:         { alignItems: 'center', gap: 8 },
  logo:           { fontSize: 56 },
  title:          { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  subtitle:       { fontSize: 15 },
  form:           { gap: 8 },
  label:          { fontSize: 14, fontWeight: '500', marginBottom: 4, marginTop: 8 },
  input:          { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  button:         { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer:         { flexDirection: 'row', justifyContent: 'center' },
  footerText:     { fontSize: 14 },
  footerLink:     { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
});
