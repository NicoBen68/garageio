import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface DatePickerProps {
  label:       string;
  value:       string;        // format AAAA-MM-JJ
  onChange:    (date: string) => void;
  placeholder?: string;
}

function parseDate(str: string): Date {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(str: string): string {
  if (!str) return '';
  const date = parseDate(str);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DatePickerField({ label, value, onChange, placeholder }: DatePickerProps) {
  const [show,    setShow]    = useState(false);
  const [tempDate, setTempDate] = useState<Date>(parseDate(value));

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selectedDate) {
        onChange(formatDate(selectedDate));
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleIOSConfirm = () => {
    onChange(formatDate(tempDate));
    setShow(false);
  };

  const handleIOSCancel = () => {
    setTempDate(parseDate(value));
    setShow(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => { setTempDate(parseDate(value)); setShow(true); }}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatDisplay(value) : (placeholder ?? 'Sélectionner une date')}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {/* Android — picker inline */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={new Date()}
          locale="fr-FR"
        />
      )}

      {/* iOS — Modal avec picker roue */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleIOSCancel}>
                  <Text style={styles.modalCancel}>Annuler</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Choisir une date</Text>
                <TouchableOpacity onPress={handleIOSConfirm}>
                  <Text style={styles.modalConfirm}>Confirmer</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={new Date()}
                locale="fr-FR"
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { gap: 6, marginBottom: 8 },
  label:        { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  input:        { backgroundColor: '#1E293B', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value:        { fontSize: 15, color: '#F8FAFC' },
  placeholder:  { fontSize: 15, color: '#475569' },
  icon:         { fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBox:     { backgroundColor: '#1E293B', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalTitle:   { fontSize: 16, fontWeight: '600', color: '#F8FAFC' },
  modalCancel:  { fontSize: 15, color: '#64748B' },
  modalConfirm: { fontSize: 15, color: '#3B82F6', fontWeight: '600' },
  picker:       { backgroundColor: '#1E293B' },
});
