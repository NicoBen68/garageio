import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';

const FUEL_TYPES = ['essence', 'diesel', 'hybride', 'electrique', 'gpl', 'autre'];

const FUEL_EMOJI: Record<string, string> = {
  essence: '⛽', diesel: '🛢️', hybride: '🔋',
  electrique: '⚡', gpl: '💨', autre: '🔧',
};

export default function VehicleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [editing,  setEditing]  = useState(false);

  const [brand,    setBrand]    = useState('');
  const [model,    setModel]    = useState('');
  const [year,     setYear]     = useState('');
  const [fuelType, setFuelType] = useState('essence');
  const [color,    setColor]    = useState('');
  const [mileage,  setMileage]  = useState('');
  const [plate,    setPlate]    = useState('');

  useEffect(() => {
    fetchVehicle();
  }, [id]);

  const fetchVehicle = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      Alert.alert('Erreur', 'Véhicule introuvable.');
      router.back();
      return;
    }

    setBrand(data.brand ?? '');
    setModel(data.model ?? '');
    setYear(data.year ? String(data.year) : '');
    setFuelType(data.fuel_type ?? 'essence');
    setColor(data.color ?? '');
    setMileage(data.current_mileage ? String(data.current_mileage) : '0');
    setPlate(data.license_plate ?? '');
    setLoading(false);
  };

  const handleSave = async () => {
    if (!brand || !model) {
      Alert.alert('Champs manquants', 'La marque et le modèle sont obligatoires.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('vehicles')
      .update({
        brand,
        model,
        year:            year ? parseInt(year) : null,
        fuel_type:       fuelType,
        color,
        current_mileage: mileage ? parseInt(mileage) : 0,
      })
      .eq('id', id);

    setSaving(false);

    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }

    setEditing(false);
    Alert.alert('✅ Sauvegardé !', 'Les informations ont été mises à jour.');
  };

  const handleArchive = () => {
    Alert.alert(
      'Archiver ce véhicule ?',
      'Il n\'apparaîtra plus dans ta liste mais ses données seront conservées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Archiver',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('vehicles').update({ is_archived: true }).eq('id', id);
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3B82F6" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
            {saving
              ? <ActivityIndicator color="#3B82F6" />
              : <Text style={styles.editBtn}>{editing ? 'Sauvegarder' : 'Modifier'}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Titre véhicule */}
        <View style={styles.titleBlock}>
          <Text style={styles.vehicleTitle}>{brand} {model}</Text>
          <View style={styles.plateBadge}>
            <Text style={styles.plateText}>{plate}</Text>
          </View>
        </View>

        {/* Kilométrage — toujours éditable */}
        <View style={styles.mileageCard}>
          <Text style={styles.mileageLabel}>🛣️ Kilométrage actuel</Text>
          <View style={styles.mileageRow}>
            <TextInput
              style={styles.mileageInput}
              keyboardType="numeric"
              value={mileage}
              onChangeText={setMileage}
            />
            <Text style={styles.mileageUnit}>km</Text>
          </View>
          {!editing && (
            <TouchableOpacity
              style={styles.mileageSaveBtn}
              onPress={async () => {
                await supabase.from('vehicles')
                  .update({ current_mileage: parseInt(mileage) || 0 })
                  .eq('id', id);
                Alert.alert('✅ Kilométrage mis à jour !');
              }}
            >
              <Text style={styles.mileageSaveBtnText}>Mettre à jour le km</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Infos détail */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>

          <Text style={styles.label}>Marque</Text>
          <TextInput
            style={[styles.input, !editing && styles.inputDisabled]}
            value={brand}
            onChangeText={setBrand}
            editable={editing}
          />

          <Text style={styles.label}>Modèle</Text>
          <TextInput
            style={[styles.input, !editing && styles.inputDisabled]}
            value={model}
            onChangeText={setModel}
            editable={editing}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Année</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                keyboardType="numeric"
                value={year}
                onChangeText={setYear}
                editable={editing}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Couleur</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={color}
                onChangeText={setColor}
                editable={editing}
              />
            </View>
          </View>
        </View>

        {/* Carburant */}
        {editing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Carburant</Text>
            <View style={styles.fuelGrid}>
              {FUEL_TYPES.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.fuelBtn, fuelType === f && styles.fuelBtnActive]}
                  onPress={() => setFuelType(f)}
                >
                  <Text style={[styles.fuelBtnText, fuelType === f && styles.fuelBtnTextActive]}>
                    {FUEL_EMOJI[f]} {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {!editing && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Carburant</Text>
            <Text style={styles.infoValue}>{FUEL_EMOJI[fuelType]} {fuelType}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.maintenanceBtn}
          onPress={() => router.push(`/(tabs)/vehicle/${id}/maintenance`)}
        >
          <Text style={styles.maintenanceBtnText}>🔧 Voir le carnet d'entretien</Text>
        </TouchableOpacity>

        {/* Archiver */}
        <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
          <Text style={styles.archiveBtnText}>Archiver ce véhicule</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0F172A' },
  centered:        { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  inner:           { padding: 24, paddingBottom: 48, gap: 24 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
  backText:        { color: '#3B82F6', fontSize: 15 },
  editBtn:         { color: '#3B82F6', fontSize: 15, fontWeight: '600' },
  titleBlock:      { gap: 10 },
  vehicleTitle:    { fontSize: 28, fontWeight: '700', color: '#F8FAFC' },
  plateBadge:      { alignSelf: 'flex-start', backgroundColor: '#1E293B', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#3B82F6' },
  plateText:       { color: '#3B82F6', fontWeight: '700', fontSize: 14, letterSpacing: 1 },
  mileageCard:     { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 10 },
  mileageLabel:    { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  mileageRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mileageInput:    { flex: 1, backgroundColor: '#0F172A', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 10, fontSize: 24, fontWeight: '700', color: '#F8FAFC' },
  mileageUnit:     { fontSize: 16, color: '#64748B' },
  mileageSaveBtn:  { backgroundColor: '#1D4ED8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  mileageSaveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  section:         { gap: 8 },
  sectionTitle:    { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  label:           { fontSize: 13, color: '#94A3B8', marginTop: 6 },
  input:           { backgroundColor: '#1E293B', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#F8FAFC' },
  inputDisabled:   { opacity: 0.6 },
  row:             { flexDirection: 'row', gap: 12 },
  halfField:       { flex: 1 },
  fuelGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fuelBtn:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1E293B' },
  fuelBtnActive:   { backgroundColor: '#1D4ED8', borderColor: '#3B82F6' },
  fuelBtnText:     { color: '#94A3B8', fontSize: 13 },
  fuelBtnTextActive: { color: '#fff', fontWeight: '600' },
  infoRow:         { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1E293B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155' },
  infoLabel:       { color: '#64748B', fontSize: 14 },
  infoValue:       { color: '#F8FAFC', fontSize: 14, fontWeight: '500' },
  archiveBtn:      { borderWidth: 1, borderColor: '#EF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  archiveBtnText:  { color: '#EF4444', fontSize: 15, fontWeight: '500' },
  maintenanceBtn:     { backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  maintenanceBtnText: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
});
