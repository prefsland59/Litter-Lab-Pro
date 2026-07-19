import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
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
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { insertRow } from '../../src/db/database';

export default function AddDogScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [color, setColor] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [registration, setRegistration] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; sex?: string }>({});

  const validate = (): boolean => {
    const newErrors: { name?: string; sex?: string } = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!sex) newErrors.sex = 'Sex is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      await insertRow('dogs', {
        name: name.trim(),
        sex,
        color: color.trim() || null,
        birthdate: birthdate.trim() || null,
        microchip: microchip.trim() || null,
        registration: registration.trim() || null,
        notes: notes.trim() || null,
        photo_uri: photoUri || null,
        is_active: 1,
      } as Record<string, unknown>);

      router.back();
    } catch (err) {
      console.error('Failed to save dog:', err);
      Alert.alert('Error', 'Failed to save dog. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
          {/* Photo picker */}
          <TouchableOpacity
            onPress={handlePickPhoto}
            style={[
              styles.photoPicker,
              { backgroundColor: colors.primary + '10', borderColor: colors.border },
            ]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons
                  name="camera-plus"
                  size={40}
                  color={colors.textSecondary}
                />
                <Text style={[styles.photoHint, { color: colors.textSecondary }]}>
                  Add Photo
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name */}
          <TextInput
            mode="outlined"
            label="Name *"
            value={name}
            onChangeText={setName}
            error={!!errors.name}
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
          />
          {errors.name ? <HelperText type="error">{errors.name}</HelperText> : null}

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
          />

          {/* Birthdate */}
          <TextInput
            mode="outlined"
            label="Birthdate (YYYY-MM-DD)"
            value={birthdate}
            onChangeText={setBirthdate}
            placeholder="2023-06-15"
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
          />

          {/* Microchip */}
          <TextInput
            mode="outlined"
            label="Microchip #"
            value={microchip}
            onChangeText={setMicrochip}
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
          />

          {/* Registration */}
          <TextInput
            mode="outlined"
            label="Registration"
            value={registration}
            onChangeText={setRegistration}
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
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
            Save Dog
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  photoPicker: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 14,
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    fontSize: 12,
    marginTop: 4,
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
});
