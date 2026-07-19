import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  Divider,
  FAB,
  Chip,
  ActivityIndicator,
  TextInput,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../../../src/theme/ThemeContext';
import {
  getRowsByField,
  deleteRow,
  insertRow,
  updateRow,
} from '../../../src/db/database';
import type { Dog, Litter, Puppy, Milestone, Photo, Expense } from '../../../src/db/schema';

function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const EXPENSE_CATEGORIES = [
  'Stud Fee', 'Vet/C-Section', 'Food', 'Supplies', 'Vaccines', 'Other',
];

export default function LitterDetailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [litter, setLitter] = useState<Litter | null>(null);
  const [dam, setDam] = useState<Dog | null>(null);
  const [sire, setSire] = useState<Dog | null>(null);
  const [puppies, setPuppies] = useState<Puppy[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline add milestone form state
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneType, setNewMilestoneType] = useState('Other');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState(new Date().toISOString().slice(0, 10));
  const [milestoneSaving, setMilestoneSaving] = useState(false);

  // Inline add expense form state
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expCategory, setExpCategory] = useState('Vet/C-Section');
  const [expAmount, setExpAmount] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expSaving, setExpSaving] = useState(false);

  const MILESTONE_TYPES = [
    'Eyes Open', 'Ears Open', 'Start Gruel', 'Full Weaning',
    'First Vaccine', 'Deworming', 'Socialization', 'Vet Check', 'Other',
  ];

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const litters = await getRowsByField<Litter>('litters', 'id', [Number(id)]);
      if (litters.length === 0) { setLoading(false); return; }
      const lit = litters[0];
      setLitter(lit);

      const dams = await getRowsByField<Dog>('dogs', 'id', [lit.dam_id]);
      setDam(dams.length > 0 ? dams[0] : null);

      if (lit.sire_id) {
        const sires = await getRowsByField<Dog>('dogs', 'id', [lit.sire_id]);
        setSire(sires.length > 0 ? sires[0] : null);
      } else {
        setSire(null);
      }

      const pups = await getRowsByField<Puppy>('puppies', 'litter_id', [Number(id)]);
      setPuppies(pups);

      const ms = await getRowsByField<Milestone>('milestones', 'litter_id', [Number(id)]);
      setMilestones(ms);

      const pics = await getRowsByField<Photo>('photos', 'entity_id', [Number(id)]);
      setPhotos(pics.filter((p) => p.entity_type === 'litter'));

      const exp = await getRowsByField<Expense>('expenses', 'litter_id', [Number(id)]);
      setExpenses(exp);
    } catch (err) {
      console.error('Failed to load litter:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) loadData();
    }, [id, loadData]),
  );

  const handleDelete = () => {
    const damName = dam?.name || 'Unknown';
    Alert.alert(
      'Delete Litter',
      `Are you sure you want to delete ${damName}'s litter? This will also delete all puppies in this litter.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!litter) return;
            try {
              await deleteRow('litters', litter.id);
              router.back();
            } catch (err) {
              console.error('Failed to delete litter:', err);
              Alert.alert('Error', 'Failed to delete litter. Please try again.');
            }
          },
        },
      ],
    );
  };

  // ── Milestone handlers ────────────────────────────────────────────────

  const handleToggleMilestone = async (ms: Milestone) => {
    try {
      if (ms.completed_at) {
        await updateRow('milestones', ms.id, { completed_at: null } as Record<string, unknown>);
      } else {
        await updateRow('milestones', ms.id, { completed_at: new Date().toISOString().slice(0, 10) } as Record<string, unknown>);
      }
      const msList = await getRowsByField<Milestone>('milestones', 'litter_id', [Number(id)]);
      setMilestones(msList);
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    }
  };

  const handleAddMilestone = async () => {
    if (!id) return;
    setMilestoneSaving(true);
    try {
      await insertRow('milestones', {
        litter_id: Number(id),
        puppy_id: null,
        milestone_type: newMilestoneType,
        title: newMilestoneTitle.trim() || newMilestoneType,
        due_date: newMilestoneDate.trim() || null,
        completed_at: null,
        notes: null,
      } as Record<string, unknown>);
      setNewMilestoneType('Other');
      setNewMilestoneTitle('');
      setNewMilestoneDate(new Date().toISOString().slice(0, 10));
      setShowAddMilestone(false);
      const msList = await getRowsByField<Milestone>('milestones', 'litter_id', [Number(id)]);
      setMilestones(msList);
    } catch (err) {
      console.error('Failed to add milestone:', err);
    } finally {
      setMilestoneSaving(false);
    }
  };

  // ── Expense handlers ──────────────────────────────────────────────────

  const handleAddExpense = async () => {
    if (!id || !expAmount.trim()) return;
    setExpSaving(true);
    try {
      await insertRow('expenses', {
        litter_id: Number(id),
        category: expCategory,
        amount: Number(expAmount.trim()),
        description: expDescription.trim() || null,
        date: expDate,
      } as Record<string, unknown>);
      setExpAmount('');
      setExpDescription('');
      setExpDate(new Date().toISOString().slice(0, 10));
      setExpCategory('Vet/C-Section');
      setShowAddExpense(false);
      const rows = await getRowsByField<Expense>('expenses', 'litter_id', [Number(id)]);
      setExpenses(rows);
    } catch (err) {
      console.error('Failed to add expense:', err);
    } finally {
      setExpSaving(false);
    }
  };

  const handleDeleteExpense = (expenseId: number) => {
    Alert.alert('Delete Expense', 'Remove this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteRow('expenses', expenseId);
          const rows = await getRowsByField<Expense>('expenses', 'litter_id', [Number(id)]);
          setExpenses(rows);
        },
      },
    ]);
  };

  // ── Photo picker ──────────────────────────────────────────────────────

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Photo library permission is needed to add photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      try {
        await insertRow('photos', {
          entity_type: 'litter',
          entity_id: Number(id),
          photo_uri: result.assets[0].uri,
          caption: null,
        } as Record<string, unknown>);
        const pics = await getRowsByField<Photo>('photos', 'entity_id', [Number(id)]);
        setPhotos(pics.filter((p) => p.entity_type === 'litter'));
      } catch (err) {
        console.error('Failed to save photo:', err);
      }
    }
  };

  const handleDeletePhoto = (photoId: number) => {
    Alert.alert('Remove Photo', 'Delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteRow('photos', photoId);
          const pics = await getRowsByField<Photo>('photos', 'entity_id', [Number(id)]);
          setPhotos(pics.filter((p) => p.entity_type === 'litter'));
        },
      },
    ]);
  };

  const formatDateShort = (dateStr: string | null): string => {
    if (!dateStr) return 'Expected';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getAgeDays = (): string => {
    if (!litter?.whelping_date) return 'Not yet whelped';
    const days = daysBetween(litter.whelping_date, new Date().toISOString().slice(0, 10));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    return `${weeks}w ${remainingDays}d`;
  };

  const aliveCount = (litter?.total_puppies || 0) - (litter?.stillborns || 0);
  const stillbornCount = litter?.stillborns || 0;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const renderPuppyCard = ({ item: puppy }: { item: Puppy }) => (
    <Card
      style={[styles.puppyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/puppy/${puppy.id}`)}
    >
      <View style={styles.puppyCardInner}>
        <View style={[styles.puppyIcon, { backgroundColor: colors.primary + '10' }]}>
          <MaterialCommunityIcons name="paw" size={24} color={colors.primary} />
        </View>
        <View style={styles.puppyInfo}>
          <Text variant="titleSmall" style={[styles.puppyName, { color: colors.text }]} numberOfLines={1}>
            {puppy.name_or_id || `Puppy #${puppy.id}`}
          </Text>
          <View style={styles.puppyMeta}>
            {puppy.sex && (
              <Chip
                mode="flat" compact
                style={[styles.puppyChip, { backgroundColor: (puppy.sex === 'male' ? '#3B82F6' : '#EC4899') + '15' }]}
                textStyle={{ color: puppy.sex === 'male' ? '#3B82F6' : '#EC4899', fontSize: 11 }}
              >
                {puppy.sex === 'male' ? '\u2642 M' : '\u2640 F'}
              </Chip>
            )}
            {puppy.color && (
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{puppy.color}</Text>
            )}
          </View>
          {puppy.birth_weight_grams != null && (
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              Birth weight: {puppy.birth_weight_grams}g
            </Text>
          )}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
      </View>
    </Card>
  );

  if (loading) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </Surface>
    );
  }

  if (!litter) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="home-heart" size={64} color={colors.textSecondary} />
        <Text variant="bodyLarge" style={{ color: colors.textSecondary, marginTop: 16 }}>
          Litter not found.
        </Text>
      </Surface>
    );
  }

  const sireName = sire ? sire.name : 'External Stud';

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <Card style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Card.Content>
            <View style={styles.headerTop}>
              <MaterialCommunityIcons name="home-heart" size={40} color={colors.accent} />
              <View style={styles.headerInfo}>
                <Text variant="headlineSmall" style={[styles.headerTitle, { color: colors.text }]}>
                  {dam?.name || 'Unknown Dam'}
                </Text>
                <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                  Sire: {sireName}
                </Text>
              </View>
            </View>
            <Divider style={[styles.headerDivider, { backgroundColor: colors.border }]} />
            <View style={styles.headerMeta}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="calendar" size={18} color={colors.textSecondary} />
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                  {formatDateShort(litter.whelping_date)}
                </Text>
              </View>
              {litter.whelping_type && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name={litter.whelping_type === 'c-section' ? 'medical-bag' : 'heart-pulse'}
                    size={18} color={colors.textSecondary}
                  />
                  <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                    {litter.whelping_type === 'c-section' ? 'C-Section' : 'Natural'}
                  </Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="dog-side" size={18} color={colors.textSecondary} />
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                  {litter.total_puppies != null ? `${aliveCount} alive` : '—'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statInner}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>
                {litter.total_puppies != null ? aliveCount : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Puppies Alive</Text>
            </View>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statInner}>
              <Text style={[styles.statNumber, { color: stillbornCount > 0 ? colors.error : colors.textSecondary }]}>
                {stillbornCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Stillborns</Text>
            </View>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statInner}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>
                {litter.whelping_date ? getAgeDays() : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Age</Text>
            </View>
          </Card>
        </View>

        {/* Age display */}
        {litter.whelping_date && (
          <View style={[styles.ageBanner, { backgroundColor: colors.accent + '15' }]}>
            <MaterialCommunityIcons name="cake-variant" size={18} color={colors.accent} />
            <Text style={[styles.ageText, { color: colors.accent }]}>{getAgeDays()} old</Text>
          </View>
        )}

        {/* Notes */}
        {litter.notes ? (
          <Card style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Card.Content>
              <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes</Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{litter.notes}</Text>
            </Card.Content>
          </Card>
        ) : null}

        {/* Puppies Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Puppies</Text>
          <Chip
            mode="flat" compact
            style={[styles.countChip, { backgroundColor: colors.border }]}
            textStyle={{ color: colors.textSecondary, fontSize: 11 }}
          >
            {puppies.length}
          </Chip>
        </View>

        {puppies.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.emptyInner}>
              <MaterialCommunityIcons name="paw" size={32} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                No puppies added yet. Tap + to add a puppy.
              </Text>
            </View>
          </Card>
        ) : (
          puppies.map((puppy) => (
            <View key={puppy.id}>
              {renderPuppyCard({ item: puppy })}
              <View style={{ height: 8 }} />
            </View>
          ))
        )}

        {/* ═══════════════════════════════════════════════════════════
            EXPENSES
            ═══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="cash-multiple" size={20} color={colors.text} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Expenses
          </Text>
          <Chip
            mode="flat" compact
            style={[styles.countChip, { backgroundColor: colors.border }]}
            textStyle={{ color: colors.textSecondary, fontSize: 11 }}
          >
            {expenses.length}
          </Chip>
        </View>

        {expenses.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.emptyInner}>
              <MaterialCommunityIcons name="cash-remove" size={28} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
                No expenses recorded
              </Text>
            </View>
          </Card>
        ) : (
          <>
            {expenses
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((e, idx) => (
                <Card
                  key={e.id}
                  style={[styles.expenseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.expenseRow}>
                    <View style={styles.expenseInfo}>
                      <View style={styles.expenseMeta}>
                        <Chip
                          mode="flat" compact
                          style={{ backgroundColor: colors.accent + '15' }}
                          textStyle={{ color: colors.accent, fontSize: 10, fontWeight: '600' }}
                        >
                          {e.category}
                        </Chip>
                        <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                          {formatDate(e.date)}
                        </Text>
                      </View>
                      {e.description ? (
                        <Text variant="bodySmall" style={{ color: colors.text }}>{e.description}</Text>
                      ) : null}
                    </View>
                    <View style={styles.expenseAmount}>
                      <Text style={[styles.expenseValue, { color: colors.text }]}>
                        ${e.amount.toFixed(2)}
                      </Text>
                      <IconButton
                        icon="delete-outline" size={16}
                        iconColor={colors.error}
                        onPress={() => handleDeleteExpense(e.id)}
                        style={{ margin: 0 }}
                      />
                    </View>
                  </View>
                </Card>
              ))}
          </>
        )}

        {/* Expense Total */}
        {expenses.length > 0 && (
          <Card style={[styles.totalCard, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total Expenses</Text>
              <Text style={[styles.totalValue, { color: colors.accent }]}>
                ${totalExpenses.toFixed(2)}
              </Text>
            </View>
          </Card>
        )}

        {/* Add Expense Form */}
        {!showAddExpense ? (
          <Button
            mode="outlined"
            onPress={() => setShowAddExpense(true)}
            style={[styles.addBtn, { borderColor: colors.accent }]}
            textColor={colors.accent}
            icon="plus"
          >
            Add Expense
          </Button>
        ) : (
          <Card style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Card.Content>
              <Text variant="labelMedium" style={{ color: colors.text, marginBottom: 8 }}>
                New Expense
              </Text>

              <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                <View style={styles.typeRow}>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <Chip
                      key={cat}
                      mode={expCategory === cat ? 'flat' : 'outlined'}
                      selected={expCategory === cat}
                      onPress={() => setExpCategory(cat)}
                      compact
                      style={[styles.typeChip, expCategory === cat && { backgroundColor: colors.accent + '30' }]}
                      textStyle={{
                        color: expCategory === cat ? colors.accent : colors.text,
                        fontSize: 12,
                      }}
                    >
                      {cat}
                    </Chip>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.formRow}>
                <TextInput
                  mode="outlined"
                  label="Amount ($)"
                  value={expAmount}
                  onChangeText={setExpAmount}
                  keyboardType="decimal-pad"
                  style={[styles.formInput, { flex: 1 }]}
                  outlineStyle={{ borderColor: colors.border }}
                  activeOutlineColor={colors.accent}
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="Date"
                  value={expDate}
                  onChangeText={setExpDate}
                  style={[styles.formInput, { flex: 1 }]}
                  outlineStyle={{ borderColor: colors.border }}
                  activeOutlineColor={colors.accent}
                  dense
                />
              </View>

              <TextInput
                mode="outlined"
                label="Description (optional)"
                value={expDescription}
                onChangeText={setExpDescription}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
                activeOutlineColor={colors.accent}
                dense
              />

              <View style={styles.formBtnRow}>
                <Button
                  mode="text"
                  onPress={() => setShowAddExpense(false)}
                  textColor={colors.textSecondary}
                  compact
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAddExpense}
                  loading={expSaving}
                  disabled={expSaving || !expAmount.trim()}
                  style={{ backgroundColor: colors.accent }}
                  compact
                  icon="check"
                >
                  Save
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Photos Section */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="camera" size={18} color={colors.text} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Photos</Text>
          <View style={{ flex: 1 }} />
          <Button
            mode="text" compact
            onPress={handlePickPhoto}
            icon="camera-plus"
            textColor={colors.accent}
            labelStyle={{ fontSize: 12 }}
          >
            Add
          </Button>
        </View>

        {photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoWrapper}>
                <Image source={{ uri: photo.photo_uri }} style={styles.photoThumb} />
                <IconButton
                  icon="close-circle" size={20} iconColor={colors.error}
                  style={styles.photoRemoveBtn}
                  onPress={() => handleDeletePhoto(photo.id)}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <Card style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.emptyInner}>
              <MaterialCommunityIcons name="image-multiple" size={28} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
                Tap "Add" to attach photos
              </Text>
            </View>
          </Card>
        )}

        {/* Milestones Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Milestones</Text>
          <Chip
            mode="flat" compact
            style={[styles.countChip, { backgroundColor: colors.border }]}
            textStyle={{ color: colors.textSecondary, fontSize: 11 }}
          >
            {milestones.filter((m) => m.completed_at).length}/{milestones.length}
          </Chip>
        </View>

        {milestones.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.emptyInner}>
              <MaterialCommunityIcons name="flag-checkered" size={32} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No milestones yet</Text>
            </View>
          </Card>
        ) : (
          milestones
            .sort((a, b) => {
              if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
              if (a.due_date) return -1;
              if (b.due_date) return 1;
              return 0;
            })
            .map((ms) => {
              const isCompleted = !!ms.completed_at;
              const isOverdue = !isCompleted && ms.due_date != null && ms.due_date < new Date().toISOString().slice(0, 10);
              return (
                <TouchableOpacity key={ms.id} onPress={() => handleToggleMilestone(ms)} activeOpacity={0.7}>
                  <Card
                    style={[
                      styles.milestoneCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isCompleted
                          ? colors.success + '40'
                          : isOverdue ? colors.error + '40' : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.milestoneRow}>
                      <MaterialCommunityIcons
                        name={isCompleted ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={isCompleted ? colors.success : isOverdue ? colors.error : colors.textSecondary}
                      />
                      <View style={styles.milestoneInfo}>
                        <Text
                          variant="bodyMedium"
                          style={[
                            styles.milestoneTitle,
                            {
                              color: isCompleted ? colors.textSecondary : colors.text,
                              textDecorationLine: isCompleted ? 'line-through' : 'none',
                            },
                          ]}
                        >
                          {ms.title}
                        </Text>
                        {ms.due_date && (
                          <Text variant="bodySmall" style={{ color: isOverdue ? colors.error : colors.textSecondary }}>
                            Due: {formatDateShort(ms.due_date)}
                            {isCompleted && ` · Done: ${formatDateShort(ms.completed_at!)}`}
                            {isOverdue && ' · Overdue'}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
        )}

        {/* Add Milestone Button / Form */}
        {!showAddMilestone ? (
          <Button
            mode="outlined"
            onPress={() => {
              setNewMilestoneType('Other');
              setNewMilestoneTitle('');
              setNewMilestoneDate(new Date().toISOString().slice(0, 10));
              setShowAddMilestone(true);
            }}
            style={[styles.addMsBtn, { borderColor: colors.accent }]}
            textColor={colors.accent}
            icon="plus"
          >
            Add Milestone
          </Button>
        ) : (
          <Card style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Card.Content>
              <Text variant="labelMedium" style={{ color: colors.text, marginBottom: 8 }}>New Milestone</Text>
              <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                <View style={styles.typeRow}>
                  {MILESTONE_TYPES.map((t) => (
                    <Chip
                      key={t}
                      mode={newMilestoneType === t ? 'flat' : 'outlined'}
                      selected={newMilestoneType === t}
                      onPress={() => {
                        setNewMilestoneType(t);
                        if (t !== 'Other') setNewMilestoneTitle(t);
                        else setNewMilestoneTitle('');
                      }}
                      compact
                      style={[styles.typeChip, newMilestoneType === t && { backgroundColor: colors.accent + '30' }]}
                      textStyle={{
                        color: newMilestoneType === t ? colors.accent : colors.text,
                        fontSize: 12,
                      }}
                    >
                      {t}
                    </Chip>
                  ))}
                </View>
              </ScrollView>
              <TextInput
                mode="outlined" label="Title"
                value={newMilestoneTitle}
                onChangeText={setNewMilestoneTitle}
                placeholder={newMilestoneType !== 'Other' ? newMilestoneType : 'Enter title...'}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
                activeOutlineColor={colors.accent}
                dense
              />
              <TextInput
                mode="outlined" label="Due Date (YYYY-MM-DD)"
                value={newMilestoneDate}
                onChangeText={setNewMilestoneDate}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
                activeOutlineColor={colors.accent}
                dense
              />
              <View style={styles.formBtnRow}>
                <Button mode="text" onPress={() => setShowAddMilestone(false)} textColor={colors.textSecondary} compact>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAddMilestone}
                  loading={milestoneSaving}
                  disabled={milestoneSaving || !newMilestoneTitle.trim()}
                  style={{ backgroundColor: colors.accent }}
                  compact
                  icon="check"
                >
                  Save
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Button
            mode="contained"
            onPress={() => router.push(`/litter/${litter.id}/edit`)}
            style={[styles.editBtn, { backgroundColor: colors.primary }]}
            contentStyle={{ paddingVertical: 6 }}
            icon="pencil"
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            onPress={handleDelete}
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            contentStyle={{ paddingVertical: 6 }}
            textColor={colors.error}
            icon="delete"
          >
            Delete
          </Button>
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.accent }]}
        color="#FFFFFF"
        label="Add Puppy"
        onPress={() => { router.push(`/puppy/add?litter_id=${id}`); }}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 80 },
  headerCard: { borderWidth: 1, borderRadius: 12, marginBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerInfo: { flex: 1 },
  headerTitle: { fontWeight: '700' },
  headerDivider: { marginVertical: 12 },
  headerMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12 },
  statInner: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  statNumber: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  ageBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 8, marginBottom: 16 },
  ageText: { fontSize: 14, fontWeight: '600' },
  notesCard: { borderWidth: 1, borderRadius: 12, marginBottom: 16 },
  notesLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  notesText: { fontSize: 15, lineHeight: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontWeight: '600', flex: 1 },
  countChip: { height: 22 },
  emptyCard: { borderWidth: 1, borderRadius: 12, marginBottom: 14 },
  emptyInner: { alignItems: 'center', padding: 24 },
  puppyCard: { borderWidth: 1, borderRadius: 12 },
  puppyCardInner: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  puppyIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  puppyInfo: { flex: 1, gap: 2 },
  puppyName: { fontWeight: '600' },
  puppyMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  puppyChip: { height: 22 },
  actionRow: { flexDirection: 'row', gap: 12, paddingTop: 4 },
  editBtn: { flex: 1, borderRadius: 10 },
  deleteBtn: { flex: 1, borderRadius: 10 },
  fab: { position: 'absolute', right: 20, bottom: 20, borderRadius: 16 },
  photoScroll: { marginBottom: 16 },
  photoWrapper: { marginRight: 10, position: 'relative' },
  photoThumb: { width: 140, height: 105, borderRadius: 10, backgroundColor: '#E5E7EB' },
  photoRemoveBtn: { position: 'absolute', top: -6, right: -6, margin: 0, padding: 0 },
  milestoneCard: { borderWidth: 1, borderRadius: 10, marginBottom: 8 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  milestoneInfo: { flex: 1, gap: 2 },
  milestoneTitle: { fontWeight: '500' },
  addMsBtn: { borderRadius: 10, marginBottom: 16 },
  addBtn: { borderRadius: 10, marginBottom: 14 },
  formCard: { borderWidth: 1, borderRadius: 12, marginBottom: 14 },
  formInput: { marginBottom: 8 },
  miniLabel: { fontSize: 13, marginBottom: 4, fontWeight: '500' },
  typeScroll: { marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 6 },
  typeChip: { marginBottom: 0 },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  formBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  // Expense styles
  expenseCard: { borderWidth: 1, borderRadius: 10, marginBottom: 8 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  expenseInfo: { flex: 1, gap: 2 },
  expenseMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expenseAmount: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  expenseValue: { fontSize: 15, fontWeight: '700' },
  totalCard: { borderWidth: 1, borderRadius: 12, marginBottom: 16, marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '800' },
});
