import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  HelperText,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../../src/theme/ThemeContext';
import { getRowsByField, updateRow, deleteRow } from '../../../src/db/database';
import type { Puppy } from '../../../src/db/schema';

export default function EditPuppyScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [nameOrId, setNameOrId] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [color, setColor] = useState('');
  const [birthWeightGrams, setBirthWeightGrams] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{ name_or_id?: string; sex?: string }>({});

  const loadPuppy = useCallback(async () => {
    if (!id) return;
    try {
      const pups = await getRowsByField<Puppy>('puppies', 'id', [Number(id)]);
      if (pups.length > 0) {
        const pup = pups[0];
        setNameOrId(pup.name_or_id || '');
        setSex(pup.sex || 'male');
        setColor(pup.color || '');
        setBirthWeightGrams(pup.birth_weight_grams != null ? String(pup.birth_weight_grams) : '');
        setNotes(pup.notes || '');
      }
    } catch (err) {
      console.error('Failed to load puppy:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) loadPuppy();
    }, [id, loadPuppy]),
  );

  const validate = (): boolean => {
    const newErrors: { name_or_id?: string; sex?: string } = {};
    if (!nameOrId.trim()) newErrors.name_or_id = 'Name or ID is required';
    if (!sex) newErrors.sex = 'Sex is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !id) return;
    setSaving(true);

    try {
      await updateRow('puppies', Number(id), {
        name_or_id: nameOrId.trim() || null,
        sex,
        color: color.trim() || null,
        birth_weight_grams: birthWeightGrams.trim() ? Number(birthWeightGrams.trim()) : null,
        notes: notes.trim() || null,
      } as Record<string, unknown>);

      router.back();
    } catch (err) {
      console.error('Failed to save puppy:', err);
      Alert.alert('Error', 'Failed to save puppy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Puppy',
      `Are you sure you want to delete ${nameOrId || 'this puppy'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await deleteRow('puppies', Number(id));
              router.back();
              router.back();
            } catch (err) {
              console.error('Failed to delete puppy:', err);
              Alert.alert('Error', 'Failed to delete puppy.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </Surface>
    );
  }

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name or ID */}
          <TextInput
            mode="outlined"
            label="Name or ID *"
            value={nameOrId}
            onChangeText={setNameOrId}
            error={!!errors.name_or_id}
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
          />
          {errors.name_or_id ? (
            <HelperText type="error">{errors.name_or_id}</HelperText>
          ) : null}

          {/* Sex */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Sex *</Text>
          <SegmentedButtons
            value={sex}
            onValueChange={(v) => setSex(v as 'male' | 'female')}
            buttons={[
              {
                value: 'male',
                label: '\u2642 Male',
                icon: 'gender-male',
              },
              {
                value: 'female',
                label: '\u2640 Female',
                icon: 'gender-female',
              },
            ]}
            style={styles.segmented}
            theme={{
              colors: {
                secondaryContainer: colors.accent + '30',
                onSecondaryContainer: colors.text,
                onSurface: colors.textSecondary,
              },
            }}
          />
          {errors.sex ? <HelperText type="error">{errors.sex}</HelperText> : null}

          {/* Color */}
          <TextInput
            mode="outlined"
            label="Color"
            value={color}
            onChangeText={setColor}
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
            placeholder="e.g. Blue Brindle, Fawn, Pied"
          />

          {/* Birth Weight */}
          <TextInput
            mode="outlined"
            label="Birth Weight (grams)"
            value={birthWeightGrams}
            onChangeText={setBirthWeightGrams}
            keyboardType="numeric"
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
            placeholder="e.g. 280"
          />

          {/* Notes */}
          <TextInput
            mode="outlined"
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
          />

          {/* Save */}
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.accent }]}
            contentStyle={{ paddingVertical: 6 }}
            icon="content-save"
          >
            Save Changes
          </Button>

          {/* Delete */}
          <Button
            mode="outlined"
            onPress={handleDelete}
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            contentStyle={{ paddingVertical: 6 }}
            textColor={colors.error}
            icon="delete"
          >
            Delete Puppy
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 12,
  },
  saveBtn: {
    marginTop: 20,
    borderRadius: 10,
  },
  deleteBtn: {
    marginTop: 12,
    borderRadius: 10,
  },
});
