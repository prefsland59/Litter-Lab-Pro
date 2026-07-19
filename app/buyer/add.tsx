import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { insertRow } from '../../src/db/database';

export default function AddBuyerScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await insertRow('buyers', {
        name: trimmedName,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      } as Record<string, unknown>);
      router.back();
    } catch (err) {
      console.error('Failed to add buyer:', err);
      Alert.alert('Error', 'Failed to save buyer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconRow}>
          <MaterialCommunityIcons name="account-plus" size={48} color={colors.accent} />
        </View>
        <Text variant="headlineSmall" style={[styles.heading, { color: colors.text }]}>
          Add Buyer
        </Text>

        <TextInput
          mode="outlined"
          label="Name *"
          value={name}
          onChangeText={(v) => { setName(v); setError(''); }}
          style={styles.input}
          outlineStyle={{ borderColor: error ? colors.error : colors.border }}
          activeOutlineColor={colors.accent}
          error={!!error}
        />
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        ) : null}

        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          outlineStyle={{ borderColor: colors.border }}
          activeOutlineColor={colors.accent}
        />
        <TextInput
          mode="outlined"
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
          outlineStyle={{ borderColor: colors.border }}
          activeOutlineColor={colors.accent}
        />
        <TextInput
          mode="outlined"
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.input}
          outlineStyle={{ borderColor: colors.border }}
          activeOutlineColor={colors.accent}
        />

        <View style={styles.btnRow}>
          <Button
            mode="text"
            onPress={() => router.back()}
            textColor={colors.textSecondary}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={{ backgroundColor: colors.accent }}
            icon="check"
          >
            Save Buyer
          </Button>
        </View>
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  iconRow: { alignItems: 'center', marginBottom: 8 },
  heading: { fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  input: { marginBottom: 12 },
  errorText: { fontSize: 12, marginTop: -8, marginBottom: 8, marginLeft: 4 },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
});
