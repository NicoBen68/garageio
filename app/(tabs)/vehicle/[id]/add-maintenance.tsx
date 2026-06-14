import { useAuthStore } from '../../../../store/authStore';
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../lib/supabase';

interface MaintenanceType {
  id:        string;
  name:      string;
  category:  string;
  is_system: boolean;
}

const CATEGORY_EMOJI: Record<string, string> = {
  vidange: '🛢️', freins: '🔴', pneus: '⚫', courroie: '⚙️',
  ct: '📋', filtres: '🌀', batterie: '🔋', climatisation: '❄️',
  carrosserie: '🚗', autre: '🔧',
};

export default function AddMaintenanceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [types,        setTypes]        = useState<MaintenanceType[]>([]);
  const [selectedType, setSelectedType] = useState<MaintenanceType | null>(null);
  const [performedAt,  setPerformedAt]  = useState(new Date().toISOString().split('T')[0]);
  const [mileage,      setMileage]      = useState('');
  const [amount,       setAmount]       = useState('');
  const [garageName,   setGarageName]   = useState('');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [step,         setStep]         = useState<'type' | 'details'>('type');

  useEffect(() => {
    fetchTypes();
    fetchCurrentMileage();
  }, []);

  const fetchTypes = async () => {
    const { data } = await supabase
      .from('maintenance_types')
      .select('id, name, category, is_system')
      .order('category')
      .order('name');
    if (data) setTypes(data);
    setLoadingTypes(false);
  };

  const fetchCurrentMileage = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('current_mileage')
      .eq('id', id)
      .single();
    if (data?.current_mileage) setMileage(String(data.current_mileage));
  };

  const createReminder = async (typeId: string, performedDate: string, mileageAtService: number | null) => {
    const { data: type } = await supabase
      .from('maintenance_types')
      .select('default_interval_months, default_interval_km')
      .eq('id', typeId)
      .single();

    if (!type) return;

    let nextDueDate = null;
    let nextDueMileage = null;

    if (type.default_interval_months) {
      const date = new Date(performedDate);
      date.setMonth(date.getMonth() + type.default_interval_months);
      nextDueDate = date.toISOString().split('T')[0];
    }

    if (type.default_interval_km && mileageAtService) {
      nextDueMileage = mileageAtService + type.default_interval_km;
    }

    if (!nextDueDate && !nextDueMileage) return;

    await supabase
      .from('reminders')
      .delete()
      .eq('vehicle_id', id)
      .eq('maintenance_type_id', typeId)
      .in('status', ['active', 'snoozed']);

    await supabase.from('reminders').insert({
      vehicle_id:          id,
      maintenance_type_id: typeId,
      next_due_date:       nextDueDate,
      next_due_mileage:    nextDueMileage,
      status:              'active',
    });
  };

  const handleSave = async () => {
    if (!selectedType) {
      Alert.alert('Erreur', "Sélectionne un type d'intervention.");
      return;
    }
    if (!performedAt) {
      Alert.alert('Erreur', 'La date est obligatoire.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('maintenance_records').insert({
      vehicle_id:          id,
      maintenance_type_id: selectedType.id,
      performed_at:        performedAt,
      mileage_at_service:  mileage    ? parseInt(mileage)   : null,
      amount:              amount     ? parseFloat(amount)  : null,
      garage_name:         garageName || null,
      notes:               notes      || null,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }

    await createReminder(selectedType.id, performedAt, mileage ? parseInt(mileage) : null);
    router.back();
  };

  const handleDeleteType = (type: MaintenanceType) => {
    if (type.is_system) return;
    Alert.alert(
      'Supprimer ce type ?',
      `"${type.name}" sera supprimé de tes suggestions.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          await supabase.from('maintenance_types').delete().eq('id', type.id);
          setTypes(prev => prev.filter(t => t.id !== type.id));
        }},
      ]
    );
  };

  const grouped = types.reduce<Record<string, MaintenanceType[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  if (step === 'type') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>Étape 1/2</Text>
        </View>

        <Text style={styles.title}>Quel type d'intervention ?</Text>

        {loadingTypes ? (
          <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.typeList}>
            {Object.entries(grouped).map(([category, items]) => (
              <View key={category} style={styles.categoryGroup}>
                <Text style={styles.categoryLabel}>
                  {CATEGORY_EMOJI[category]} {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                {items.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.typeCard, selectedType?.id === type.id && styles.typeCardActive]}
                    onPress={() => { setSelectedType(type); setStep('details'); }}
                    onLongPress={() => handleDeleteType(type)}
                  >
                    <Text style={[styles.typeName, selectedType?.id === type.id && styles.typeNameActive]}>
                      {type.name}{!type.is_system ? ' ✏️' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={styles.categoryGroup}>
              <Text style={styles.categoryLabel}>✏️ Personnalisé</Text>
              <TouchableOpacity
                style={styles.typeCard}
                onPress={() => {
                  Alert.prompt(
                    'Intervention personnalisée',
                    'Nomme ton intervention',
                    async (name) => {
                      if (!name?.trim()) return;
                      const { data } = await supabase
                        .from('maintenance_types')
                        .insert({ name: name.trim(), category: 'autre', is_system: false, user_id: user!.id })
                        .select()
                        .single();
                      if (data) { setSelectedType(data); setStep('details'); }
                    },
                    'plain-text'
                  );
                }}
              >
                <Text style={styles.typeName}>＋ Saisir une intervention libre...</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('type')}>
            <Text style={styles.backText}>← Changer</Text>
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>Étape 2/2</Text>
        </View>

        <Text style={styles.title}>Détails de l'intervention</Text>

        <View style={styles.selectedTypeBadge}>
          <Text style={styles.selectedTypeEmoji}>{CATEGORY_EMOJI[selectedType?.category ?? 'autre']}</Text>
          <Text style={styles.selectedTypeName}>{selectedType?.name}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date *</Text>
          <TextInput style={styles.input} value={performedAt} onChangeText={setPerformedAt} placeholder="AAAA-MM-JJ" placeholderTextColor="#475569" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Kilométrage au moment de l'intervention</Text>
          <TextInput style={styles.input} value={mileage} onChangeText={setMileage} keyboardType="numeric" placeholder="45000" placeholderTextColor="#475569" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Montant (€)</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="89.90" placeholderTextColor="#475569" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Garage / Prestataire</Text>
          <TextInput style={styles.input} value={garageName} onChangeText={setGarageName} placeholder="Garage du Centre" placeholderTextColor="#475569" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Remarques, références pièces..." placeholderTextColor="#475569" multiline numberOfLines={3} />
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Enregistrer l'intervention</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#0F172A' },
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  backText:          { color: '#3B82F6', fontSize: 15 },
  stepIndicator:     { color: '#64748B', fontSize: 13 },
  title:             { fontSize: 24, fontWeight: '700', color: '#F8FAFC', paddingHorizontal: 24, marginBottom: 16 },
  typeList:          { paddingHorizontal: 24, paddingBottom: 48, gap: 20 },
  categoryGroup:     { gap: 8 },
  categoryLabel:     { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  typeCard:          { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155' },
  typeCardActive:    { backgroundColor: '#1D4ED8', borderColor: '#3B82F6' },
  typeName:          { fontSize: 15, color: '#CBD5E1', fontWeight: '500' },
  typeNameActive:    { color: '#fff' },
  inner:             { padding: 24, paddingBottom: 48, gap: 4 },
  selectedTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#3B82F6', marginBottom: 16 },
  selectedTypeEmoji: { fontSize: 24 },
  selectedTypeName:  { fontSize: 16, fontWeight: '600', color: '#F8FAFC' },
  field:             { gap: 6, marginBottom: 8 },
  label:             { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  input:             { backgroundColor: '#1E293B', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#F8FAFC' },
  textArea:          { height: 80, textAlignVertical: 'top' },
  saveBtn:           { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  btnDisabled:       { opacity: 0.5 },
  saveBtnText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
});
