import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/colors';

export default function RegisterScreen() {
  const c = useColors();
  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirm) {
      Alert.alert('Erreur', 'Remplis tous les champs.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit faire au moins 8 caractères.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setLoading(false);
      Alert.alert('Erreur d\'inscription', error.message);
      return;
    }

    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id, email: data.user.email!, full_name: fullName,
      });
    }

    setLoading(false);
    Alert.alert('Compte créé !', 'Vérifie ton email pour confirmer ton compte.');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.logo} accessibilityElementsHidden>🚗</Text>
          <Text
            style={[styles.title, { color: c.textPrimary }]}
            maxFontSizeMultiplier={1.3}
            accessibilityRole="header"
          >
            Créer un compte
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>
            Gratuit, sans CB requise
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Prénom & Nom</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]}
            placeholder="Nicolas Dupont"
            placeholderTextColor={c.textMuted}
            autoCapitalize="words"
            autoComplete="name"
            value={fullName}
            onChangeText={setFullName}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Prénom et nom"
          />

          <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]}
            placeholder="tu@email.com"
            placeholderTextColor={c.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Adresse email"
          />

          <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Mot de passe</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]}
            placeholder="8 caractères minimum"
            placeholderTextColor={c.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Mot de passe, 8 caractères minimum"
          />

          <Text style={[styles.label, { color: c.textSecondary }]} maxFontSizeMultiplier={1.3}>Confirmer le mot de passe</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.input, borderColor: c.inputBorder, color: c.textPrimary }]}
            placeholder="••••••••"
            placeholderTextColor={c.textMuted}
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Confirmer le mot de passe"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Créer mon compte"
            accessibilityState={{ disabled: loading }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText} maxFontSizeMultiplier={1.3}>Créer mon compte</Text>
            }
          </TouchableOpacity>

          <Text
            style={[styles.legal, { color: c.textDisabled }]}
            maxFontSizeMultiplier={1.2}
          >
            En t'inscrivant, tu acceptes nos conditions d'utilisation et notre politique de confidentialité.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.textMuted }]} maxFontSizeMultiplier={1.3}>
            Déjà un compte ?{' '}
          </Text>
          <Link href="/(auth)/login" accessibilityRole="link" accessibilityLabel="Se connecter, j'ai déjà un compte">
            <Text style={styles.footerLink} maxFontSizeMultiplier={1.3}>Se connecter</Text>
          </Link>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  inner:          { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48, gap: 32 },
  header:         { alignItems: 'center', gap: 8 },
  logo:           { fontSize: 48 },
  title:          { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle:       { fontSize: 14 },
  form:           { gap: 8 },
  label:          { fontSize: 14, fontWeight: '500', marginBottom: 4, marginTop: 8 },
  input:          { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, minHeight: 44 },
  button:         { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16, minHeight: 44 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  legal:          { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  footer:         { flexDirection: 'row', justifyContent: 'center' },
  footerText:     { fontSize: 14 },
  footerLink:     { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
});
