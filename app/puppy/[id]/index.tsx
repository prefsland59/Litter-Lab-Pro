import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  Divider,
  TextInput,
  SegmentedButtons,
  Chip,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../../../src/theme/ThemeContext';
import {
  getRowsByField,
  insertRow,
  updateRow,
  deleteRow,
  getAllRows,
} from '../../../src/db/database';
import type {
  Puppy, Litter, WeightEntry, FeedingLog, HealthNote, Photo,
  Placement, Buyer,
} from '../../../src/db/schema';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = { left: 55, right: 16, top: 16, bottom: 50 };
const CHART_HEIGHT = 200;
const DRAW_WIDTH = SCREEN_WIDTH - 32 - CHART_PADDING.left - CHART_PADDING.right;
const DRAW_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

const PLACEMENT_STATUSES = ['Reserved', 'Deposit Paid', 'Paid in Full', 'Picked Up'];

function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getAgeString(birthDate: string | null): string {
  if (!birthDate) return 'Unknown age';
  const days = daysBetween(birthDate, new Date().toISOString().slice(0, 10));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  if (remainingDays === 0) return `${weeks}w`;
  return `${weeks}w ${remainingDays}d`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PuppyDetailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [puppy, setPuppy] = useState<Puppy | null>(null);
  const [litter, setLitter] = useState<Litter | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [feedings, setFeedings] = useState<FeedingLog[]>([]);
  const [healthNotes, setHealthNotes] = useState<HealthNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline form state — Weight
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));
  const [weightGrams, setWeightGrams] = useState('');
  const [weightSaving, setWeightSaving] = useState(false);

  // Inline form state — Feeding
  const [feedingDate, setFeedingDate] = useState(new Date().toISOString().slice(0, 10));
  const [feedingType, setFeedingType] = useState<'bottle' | 'gruel' | 'solid'>('bottle');
  const [feedingNotes, setFeedingNotes] = useState('');
  const [feedingSaving, setFeedingSaving] = useState(false);

  // Inline form state — Health
  const [healthDate, setHealthDate] = useState(new Date().toISOString().slice(0, 10));
  const [healthDescription, setHealthDescription] = useState('');
  const [healthSaving, setHealthSaving] = useState(false);

  // Photo state
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Placement state
  const [placement, setPlacement] = useState<(Placement & { buyer_name?: string }) | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [showPlacementForm, setShowPlacementForm] = useState(false);
  const [plBuyerId, setPlBuyerId] = useState<number | null>(null);
  const [plStatus, setPlStatus] = useState('Reserved');
  const [plDeposit, setPlDeposit] = useState('');
  const [plPrice, setPlPrice] = useState('');
  const [plPickupDate, setPlPickupDate] = useState('');
  const [plSaving, setPlSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const pid = Number(id);

      // Load puppy
      const pups = await getRowsByField<Puppy>('puppies', 'id', [pid]);
      if (pups.length === 0) { setLoading(false); return; }
      const pup = pups[0];
      setPuppy(pup);

      // Load litter
      const litters = await getRowsByField<Litter>('litters', 'id', [pup.litter_id]);
      setLitter(litters.length > 0 ? litters[0] : null);

      // Load weight entries
      const weightRows = await getRowsByField<WeightEntry>('weight_entries', 'puppy_id', [pid]);
      setWeights(weightRows);

      // Load feeding logs
      const feedingRows = await getRowsByField<FeedingLog>('feeding_logs', 'puppy_id', [pid]);
      setFeedings(feedingRows);

      // Load health notes
      const healthRows = await getRowsByField<HealthNote>('health_notes', 'puppy_id', [pid]);
      setHealthNotes(healthRows);

      // Load photos
      const pics = await getRowsByField<Photo>('photos', 'entity_id', [pid]);
      setPhotos(pics.filter((p) => p.entity_type === 'puppy'));

      // Load placement
      const placements = await getRowsByField<Placement>('placements', 'puppy_id', [pid]);
      if (placements.length > 0) {
        const pl = placements[0];
        const bRows = await getRowsByField<Buyer>('buyers', 'id', [pl.buyer_id]);
        setPlacement({ ...pl, buyer_name: bRows.length > 0 ? bRows[0].name : 'Unknown' });
      } else {
        setPlacement(null);
      }

      // Load all buyers for picker
      const allBuyers = await getAllRows<Buyer>('buyers');
      setBuyers(allBuyers);
    } catch (err) {
      console.error('Failed to load puppy:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) loadData();
    }, [id, loadData]),
  );

  // ── Weight entry handlers ──────────────────────────────────────────────

  const handleAddWeight = async () => {
    if (!id || !weightGrams.trim()) return;
    setWeightSaving(true);
    try {
      await insertRow('weight_entries', {
        puppy_id: Number(id),
        date: weightDate,
        weight_grams: Number(weightGrams.trim()),
      } as Record<string, unknown>);
      setWeightGrams('');
      setWeightDate(new Date().toISOString().slice(0, 10));
      const rows = await getRowsByField<WeightEntry>('weight_entries', 'puppy_id', [Number(id)]);
      setWeights(rows);
    } catch (err) {
      console.error('Failed to add weight:', err);
    } finally {
      setWeightSaving(false);
    }
  };

  const handleDeleteWeight = (weightId: number) => {
    Alert.alert('Delete Weight Entry', 'Remove this weight entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteRow('weight_entries', weightId);
          const rows = await getRowsByField<WeightEntry>('weight_entries', 'puppy_id', [Number(id)]);
          setWeights(rows);
        },
      },
    ]);
  };

  // ── Feeding entry handlers ─────────────────────────────────────────────

  const handleAddFeeding = async () => {
    if (!id) return;
    setFeedingSaving(true);
    try {
      await insertRow('feeding_logs', {
        puppy_id: Number(id),
        date: feedingDate,
        feed_type: feedingType,
        notes: feedingNotes.trim() || null,
      } as Record<string, unknown>);
      setFeedingNotes('');
      setFeedingDate(new Date().toISOString().slice(0, 10));
      const rows = await getRowsByField<FeedingLog>('feeding_logs', 'puppy_id', [Number(id)]);
      setFeedings(rows);
    } catch (err) {
      console.error('Failed to add feeding:', err);
    } finally {
      setFeedingSaving(false);
    }
  };

  const handleDeleteFeeding = (feedingId: number) => {
    Alert.alert('Delete Feeding Entry', 'Remove this feeding entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteRow('feeding_logs', feedingId);
          const rows = await getRowsByField<FeedingLog>('feeding_logs', 'puppy_id', [Number(id)]);
          setFeedings(rows);
        },
      },
    ]);
  };

  // ── Health note handlers ───────────────────────────────────────────────

  const handleAddHealth = async () => {
    if (!id || !healthDescription.trim()) return;
    setHealthSaving(true);
    try {
      await insertRow('health_notes', {
        puppy_id: Number(id),
        date: healthDate,
        description: healthDescription.trim(),
      } as Record<string, unknown>);
      setHealthDescription('');
      setHealthDate(new Date().toISOString().slice(0, 10));
      const rows = await getRowsByField<HealthNote>('health_notes', 'puppy_id', [Number(id)]);
      setHealthNotes(rows);
    } catch (err) {
      console.error('Failed to add health note:', err);
    } finally {
      setHealthSaving(false);
    }
  };

  const handleDeleteHealth = (healthId: number) => {
    Alert.alert('Delete Health Note', 'Remove this health note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteRow('health_notes', healthId);
          const rows = await getRowsByField<HealthNote>('health_notes', 'puppy_id', [Number(id)]);
          setHealthNotes(rows);
        },
      },
    ]);
  };

  // ── Photo handlers ─────────────────────────────────────────────────────

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Photo library permission is needed to add photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      try {
        await insertRow('photos', {
          entity_type: 'puppy',
          entity_id: Number(id),
          photo_uri: result.assets[0].uri,
          caption: null,
        } as Record<string, unknown>);
        const pics = await getRowsByField<Photo>('photos', 'entity_id', [Number(id)]);
        setPhotos(pics.filter((p) => p.entity_type === 'puppy'));
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
          setPhotos(pics.filter((p) => p.entity_type === 'puppy'));
        },
      },
    ]);
  };

  // ── Placement handlers ─────────────────────────────────────────────────

  const openPlacementForm = () => {
    setPlBuyerId(buyers.length > 0 ? buyers[0].id : null);
    setPlStatus('Reserved');
    setPlDeposit('');
    setPlPrice('');
    setPlPickupDate('');
    setShowPlacementForm(true);
  };

  const handleSavePlacement = async () => {
    if (!id || !plBuyerId) return;
    setPlSaving(true);
    try {
      const pid = Number(id);
      const data = {
        puppy_id: pid,
        buyer_id: plBuyerId,
        status: plStatus,
        deposit_amount: plDeposit.trim() ? Number(plDeposit.trim()) : null,
        price: plPrice.trim() ? Number(plPrice.trim()) : null,
        pickup_date: plPickupDate.trim() || null,
        notes: null,
      } as Record<string, unknown>;

      if (placement && placement.id) {
        await updateRow('placements', placement.id, data);
      } else {
        await insertRow('placements', data);
      }

      setShowPlacementForm(false);
      // Reload
      const placements = await getRowsByField<Placement>('placements', 'puppy_id', [pid]);
      if (placements.length > 0) {
        const pl = placements[0];
        const bRows = await getRowsByField<Buyer>('buyers', 'id', [pl.buyer_id]);
        setPlacement({ ...pl, buyer_name: bRows.length > 0 ? bRows[0].name : 'Unknown' });
      }
    } catch (err) {
      console.error('Failed to save placement:', err);
    } finally {
      setPlSaving(false);
    }
  };

  const handleRemovePlacement = () => {
    if (!placement) return;
    Alert.alert('Remove Placement', 'Remove this placement assignment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await deleteRow('placements', placement.id);
          setPlacement(null);
        },
      },
    ]);
  };

  // ── Delete puppy ───────────────────────────────────────────────────────

  const handleDelete = () => {
    Alert.alert(
      'Delete Puppy',
      `Are you sure you want to delete ${puppy?.name_or_id || 'this puppy'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            if (!puppy) return;
            try {
              await deleteRow('puppies', puppy.id);
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

  // ── Growth Chart helpers ──────────────────────────────────────────────

  const sortedWeights = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const minWeight = sortedWeights.length > 0
    ? Math.min(...sortedWeights.map((w) => w.weight_grams))
    : 0;
  const maxWeight = sortedWeights.length > 0
    ? Math.max(...sortedWeights.map((w) => w.weight_grams))
    : 1;
  const weightRange = maxWeight - minWeight || 1;

  const getX = (index: number): number => {
    if (sortedWeights.length <= 1) return CHART_PADDING.left + DRAW_WIDTH / 2;
    return CHART_PADDING.left + (DRAW_WIDTH * index) / (sortedWeights.length - 1);
  };

  const getY = (weight: number): number => {
    return CHART_PADDING.top + DRAW_HEIGHT * (1 - (weight - minWeight) / weightRange);
  };

  // ── Loading / not found ────────────────────────────────────────────────

  if (loading) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </Surface>
    );
  }

  if (!puppy) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="paw" size={64} color={colors.textSecondary} />
        <Text variant="bodyLarge" style={{ color: colors.textSecondary, marginTop: 16 }}>
          Puppy not found.
        </Text>
      </Surface>
    );
  }

  const latestWeight = weights.length > 0 ? weights[0].weight_grams : null;
  const ageString = getAgeString(litter?.whelping_date || null);
  const sexColor = puppy.sex === 'male' ? '#3B82F6' : '#EC4899';
  const sexLabel = puppy.sex === 'male' ? '\u2642 Male' : '\u2640 Female';

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text variant="headlineSmall" style={[styles.puppyName, { color: colors.text }]}>
              {puppy.name_or_id || `Puppy #${puppy.id}`}
            </Text>
            <View style={styles.headerMeta}>
              <Chip
                mode="flat" compact
                style={[styles.sexChip, { backgroundColor: sexColor + '15' }]}
                textStyle={{ color: sexColor, fontSize: 12, fontWeight: '600' }}
              >
                {sexLabel}
              </Chip>
              {puppy.color ? (
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{puppy.color}</Text>
              ) : null}
              {litter ? (
                <Button
                  mode="text" compact
                  onPress={() => router.push(`/litter/${litter.id}`)}
                  textColor={colors.accent}
                  icon="home-heart"
                  labelStyle={{ fontSize: 12 }}
                >
                  Litter
                </Button>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Photo Header & Gallery ── */}
        <View style={styles.photoSection}>
          {photos.length > 0 ? (
            <Image source={{ uri: photos[0].photo_uri }} style={styles.headerPhoto} />
          ) : (
            <View style={[styles.headerPhotoPlaceholder, { backgroundColor: colors.primary + '10' }]}>
              <MaterialCommunityIcons name="paw" size={60} color={colors.primary} />
            </View>
          )}
          <Button
            mode="text" compact
            onPress={handlePickPhoto}
            icon="camera-plus"
            textColor={colors.accent}
            style={styles.addPhotoBtn}
            labelStyle={{ fontSize: 12 }}
          >
            Add Photo
          </Button>
        </View>

        {photos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {photos.slice(1).map((photo) => (
              <View key={photo.id} style={styles.photoWrapper}>
                <Image source={{ uri: photo.photo_uri }} style={styles.photoThumb} />
                <IconButton
                  icon="close-circle" size={18} iconColor={colors.error}
                  style={styles.photoRemoveBtn}
                  onPress={() => handleDeletePhoto(photo.id)}
                />
              </View>
            ))}
          </ScrollView>
        )}

        {photos.length === 1 && (
          <View style={{ position: 'relative', alignSelf: 'center', marginTop: 4 }}>
            <IconButton
              icon="close-circle" size={18} iconColor={colors.error}
              style={{ position: 'absolute', top: -8, right: -8, zIndex: 1, margin: 0 }}
              onPress={() => handleDeletePhoto(photos[0].id)}
            />
          </View>
        )}

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statInner}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>{ageString}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Age</Text>
            </View>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statInner}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>
                {puppy.birth_weight_grams != null ? `${puppy.birth_weight_grams}g` : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Birth Weight</Text>
            </View>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statInner}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>
                {latestWeight != null ? `${latestWeight}g` : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Latest Weight</Text>
            </View>
          </Card>
        </View>

        {/* ── Notes ── */}
        {puppy.notes ? (
          <Card style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Card.Content>
              <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes</Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{puppy.notes}</Text>
            </Card.Content>
          </Card>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════
            GROWTH CHART - LINE GRAPH
            ═══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="chart-line" size={20} color={colors.text} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Growth Chart
          </Text>
        </View>

        {sortedWeights.length > 0 ? (
          <Card style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Card.Content>
              {/* Min/Max labels */}
              <View style={styles.chartLegend}>
                <Text style={[styles.chartLegendText, { color: colors.textSecondary }]}>
                  Max: {maxWeight}g
                </Text>
                <Text style={[styles.chartLegendText, { color: colors.textSecondary }]}>
                  Min: {minWeight}g
                </Text>
              </View>

              {/* Chart area */}
              <View style={[styles.chartArea, { height: CHART_HEIGHT }]}>
                {/* Y-axis gridlines and labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                  const y = CHART_PADDING.top + DRAW_HEIGHT * (1 - frac);
                  const val = Math.round(minWeight + weightRange * frac);
                  return (
                    <View key={`grid-${frac}`} style={[styles.gridLine, { top: y, borderColor: colors.border }]}>
                      <Text style={[styles.yLabel, { color: colors.textSecondary }]}>{val}</Text>
                    </View>
                  );
                })}

                {/* Data points and connecting lines */}
                {sortedWeights.map((w, i) => {
                  const x = getX(i);
                  const y = getY(w.weight_grams);
                  return (
                    <React.Fragment key={w.id}>
                      {/* Line to next point */}
                      {i < sortedWeights.length - 1 && (() => {
                        const nextX = getX(i + 1);
                        const nextY = getY(sortedWeights[i + 1].weight_grams);
                        const dx = nextX - x;
                        const dy = nextY - y;
                        const length = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                        return (
                          <View
                            style={[
                              styles.chartLine,
                              {
                                left: x,
                                top: y,
                                width: length,
                                backgroundColor: colors.accent,
                                transform: [{ rotate: `${angle}deg` }],
                                transformOrigin: 'left center',
                              },
                            ]}
                          />
                        );
                      })()}
                      {/* Dot */}
                      <View
                        style={[
                          styles.chartDot,
                          {
                            left: x - 5,
                            top: y - 5,
                            backgroundColor: colors.accent,
                            borderColor: colors.surface,
                          },
                        ]}
                      />
                    </React.Fragment>
                  );
                })}
              </View>

              {/* X-axis date labels */}
              <View style={styles.xAxisLabels}>
                {sortedWeights.length <= 1 ? (
                  <Text style={[styles.xLabel, { color: colors.textSecondary }]}>
                    {formatDateShort(sortedWeights[0].date)}
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.xLabel, { color: colors.textSecondary, textAlign: 'left' }]}>
                      {formatDateShort(sortedWeights[0].date)}
                    </Text>
                    {sortedWeights.length > 2 && (
                      <Text style={[styles.xLabel, { color: colors.textSecondary, textAlign: 'center' }]}>
                        {formatDateShort(sortedWeights[Math.floor(sortedWeights.length / 2)].date)}
                      </Text>
                    )}
                    <Text style={[styles.xLabel, { color: colors.textSecondary, textAlign: 'right' }]}>
                      {formatDateShort(sortedWeights[sortedWeights.length - 1].date)}
                    </Text>
                  </>
                )}
              </View>
            </Card.Content>
          </Card>
        ) : (
          <Card style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.emptyInner}>
              <MaterialCommunityIcons name="chart-line" size={28} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
                Add weight entries to see growth chart
              </Text>
            </View>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════
            WEIGHT TRACKING - LIST
            ═══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="scale-bathroom" size={20} color={colors.text} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Weight Entries
          </Text>
        </View>

        {weights.length > 0 && (
          <Card style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Card.Content>
              {weights.map((w, idx) => (
                <React.Fragment key={w.id}>
                  {idx > 0 && <Divider style={[styles.listDivider, { backgroundColor: colors.border }]} />}
                  <View style={styles.listRow}>
                    <View style={styles.listInfo}>
                      <Text variant="bodyMedium" style={{ color: colors.text, fontWeight: '600' }}>
                        {w.weight_grams}g
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                        {formatDate(w.date)}
                      </Text>
                    </View>
                    <Button
                      mode="text" compact
                      onPress={() => handleDeleteWeight(w.id)}
                      textColor={colors.error}
                      icon="delete-outline"
                      labelStyle={{ fontSize: 11 }}
                    >
                      Remove
                    </Button>
                  </View>
                </React.Fragment>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Add Weight Form */}
        <Card style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Card.Content>
            <Text variant="labelMedium" style={{ color: colors.text, marginBottom: 8 }}>Add Weight Entry</Text>
            <View style={styles.formRow}>
              <TextInput
                mode="outlined" label="Date"
                value={weightDate} onChangeText={setWeightDate}
                style={[styles.formInput, { flex: 1 }]}
                outlineStyle={{ borderColor: colors.border }}
                activeOutlineColor={colors.accent}
                dense
              />
              <TextInput
                mode="outlined" label="Weight (g)"
                value={weightGrams} onChangeText={setWeightGrams}
                keyboardType="numeric"
                style={[styles.formInput, { flex: 1 }]}
                outlineStyle={{ borderColor: colors.border }}
                activeOutlineColor={colors.accent}
                dense
              />
            </View>
            <Button
              mode="contained"
              onPress={handleAddWeight}
              loading={weightSaving}
              disabled={weightSaving || !weightGrams.trim()}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
              contentStyle={{ paddingVertical: 4 }}
              icon="plus" compact
            >
              Add Weight
            </Button>
          </Card.Content>
        </Card>

        {/* ═══════════════════════════════════════════════════════════
            FEEDING LOG
            ═══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="food-drumstick" size={20} color={colors.text} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Feeding Log
          </Text>
        </View>

        {feedings.length > 0 ? (
          <Card style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Card.Content>
              {feedings.map((f, idx) => (
                <React.Fragment key={f.id}>
                  {idx > 0 && <Divider style={[styles.listDivider, { backgroundColor: colors.border }]} />}
                  <View style={styles.listRow}>
                    <View style={styles.listInfo}>
                      <View style={styles.feedingTitleRow}>
                        <Chip
                          mode="flat" compact
                          style={[styles.feedChip, {
                            backgroundColor:
                              f.feed_type === 'bottle' ? '#3B82F6' + '15'
                                : f.feed_type === 'gruel' ? '#D97706' + '15'
                                : '#16A34A' + '15',
                          }]}
                          textStyle={{
                            color:
                              f.feed_type === 'bottle' ? '#3B82F6'
                                : f.feed_type === 'gruel' ? '#D97706'
                                : '#16A34A',
                            fontSize: 11,
                          }}
                        >
                          {f.feed_type === 'bottle' ? 'Bottle' : f.feed_type === 'gruel' ? 'Gruel' : 'Solid'}
                        </Chip>
                      </View>
                      <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{formatDate(f.date)}</Text>
                      {f.notes ? (
                        <Text variant="bodySmall" style={{ color: colors.text, marginTop: 2 }}>{f.notes}</Text>
                      ) : null}
                    </View>
                    <Button
                      mode="text" compact
                      onPress={() => handleDeleteFeeding(f.id)}
                      textColor={colors.error}
                      icon="delete-outline"
                      labelStyle={{ fontSize: 11 }}
                    >
                      Remove
                    </Button>
                  </View>
                </React.Fragment>
              ))}
            </Card.Content>
          </Card>
        ) : (
          <Card style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.emptyInner}>
              <MaterialCommunityIcons name="food-off" size={24} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
                No feeding entries yet
              </Text>
            </View>
          </Card>
        )}

        {/* Add Feeding Form */}
        <Card style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Card.Content>
            <Text variant="labelMedium" style={{ color: colors.text, marginBottom: 8 }}>Log Feeding</Text>
            <TextInput
              mode="outlined" label="Date"
              value={feedingDate} onChangeText={setFeedingDate}
              style={styles.formInput}
              outlineStyle={{ borderColor: colors.border }}
              activeOutlineColor={colors.accent}
              dense
            />
            <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Feed Type</Text>
            <SegmentedButtons
              value={feedingType}
              onValueChange={(v) => setFeedingType(v as 'bottle' | 'gruel' | 'solid')}
              buttons={[
                { value: 'bottle', label: 'Bottle' },
                { value: 'gruel', label: 'Gruel' },
                { value: 'solid', label: 'Solid' },
              ]}
              style={styles.segmentedSm}
              density="small"
              theme={{
                colors: {
                  secondaryContainer: colors.accent + '30',
                  onSecondaryContainer: colors.text,
                  onSurface: colors.textSecondary,
                },
              }}
            />
            <TextInput
              mode="outlined" label="Notes (optional)"
              value={feedingNotes} onChangeText={setFeedingNotes}
              style={styles.formInput}
              outlineStyle={{ borderColor: colors.border }}
              activeOutlineColor={colors.accent}
              dense
            />
            <Button
              mode="contained"
              onPress={handleAddFeeding}
              loading={feedingSaving}
              disabled={feedingSaving}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
              contentStyle={{ paddingVertical: 4 }}
              icon="plus" compact
            >
              Log Feeding
            </Button>
          </Card.Content>
        </Card>

        {/* ═══════════════════════════════════════════════════════════
            HEALTH NOTES
            ═══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="heart-pulse" size={20} color={colors.text} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Health Notes
          </Text>
        </View>

        {healthNotes.length > 0 ? (
          <Card style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Card.Content>
              {healthNotes.map((h, idx) => (
                <React.Fragment key={h.id}>
                  {idx > 0 && <Divider style={[styles.listDivider, { backgroundColor: colors.border }]} />}
                  <View style={styles.listRow}>
                    <View style={styles.listInfo}>
                      <Text variant="bodyMedium" style={{ color: colors.text }}>{h.description}</Text>
                      <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{formatDate(h.date)}</Text>
                    </View>
                    <Button
                      mode="text" compact
                      onPress={() => handleDeleteHealth(h.id)}
                      textColor={colors.error}
                      icon="delete-outline"
                      labelStyle={{ fontSize: 11 }}
                    >
                      Remove
                    </Button>
                  </View>
                </React.Fragment>
              ))}
            </Card.Content>
          </Card>
        ) : (
          <Card style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.emptyInner}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={24} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
                No health notes yet
              </Text>
            </View>
          </Card>
        )}

        {/* Add Health Form */}
        <Card style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Card.Content>
            <Text variant="labelMedium" style={{ color: colors.text, marginBottom: 8 }}>Add Health Note</Text>
            <TextInput
              mode="outlined" label="Date"
              value={healthDate} onChangeText={setHealthDate}
              style={styles.formInput}
              outlineStyle={{ borderColor: colors.border }}
              activeOutlineColor={colors.accent}
              dense
            />
            <TextInput
              mode="outlined" label="Description"
              value={healthDescription} onChangeText={setHealthDescription}
              multiline numberOfLines={2}
              style={styles.formInput}
              outlineStyle={{ borderColor: colors.border }}
              activeOutlineColor={colors.accent}
              dense
            />
            <Button
              mode="contained"
              onPress={handleAddHealth}
              loading={healthSaving}
              disabled={healthSaving || !healthDescription.trim()}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
              contentStyle={{ paddingVertical: 4 }}
              icon="plus" compact
            >
              Add Note
            </Button>
          </Card.Content>
        </Card>

        {/* ═══════════════════════════════════════════════════════════
            PLACEMENT
            ═══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="home-account" size={20} color={colors.text} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Placement
          </Text>
        </View>

        {placement ? (
          <>
            <Card style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Card.Content>
                <View style={styles.placementSummary}>
                  <View style={styles.placementDetail}>
                    <MaterialCommunityIcons name="account" size={18} color={colors.accent} />
                    <Text style={[styles.placementLabel, { color: colors.textSecondary }]}>Buyer</Text>
                    <Text style={[styles.placementValue, { color: colors.text }]}>
                      {placement.buyer_name || 'Unknown'}
                    </Text>
                  </View>

                  <View style={styles.placementDetail}>
                    <MaterialCommunityIcons name="flag" size={18} color={colors.accent} />
                    <Text style={[styles.placementLabel, { color: colors.textSecondary }]}>Status</Text>
                    <Chip
                      mode="flat" compact
                      style={[styles.placementStatusChip, {
                        backgroundColor:
                          placement.status === 'Picked Up' ? colors.success + '20'
                            : placement.status === 'Paid in Full' ? '#3B82F6' + '20'
                            : placement.status === 'Deposit Paid' ? colors.warning + '20'
                            : colors.accent + '20',
                      }]}
                      textStyle={{
                        color:
                          placement.status === 'Picked Up' ? colors.success
                            : placement.status === 'Paid in Full' ? '#3B82F6'
                            : placement.status === 'Deposit Paid' ? colors.warning
                            : colors.accent,
                        fontSize: 11,
                        fontWeight: '600',
                      }}
                    >
                      {placement.status}
                    </Chip>
                  </View>

                  {placement.price != null && (
                    <View style={styles.placementDetail}>
                      <MaterialCommunityIcons name="currency-usd" size={18} color={colors.accent} />
                      <Text style={[styles.placementLabel, { color: colors.textSecondary }]}>Price</Text>
                      <Text style={[styles.placementValue, { color: colors.text }]}>
                        ${placement.price.toFixed(2)}
                      </Text>
                    </View>
                  )}

                  {placement.deposit_amount != null && (
                    <View style={styles.placementDetail}>
                      <MaterialCommunityIcons name="cash-check" size={18} color={colors.accent} />
                      <Text style={[styles.placementLabel, { color: colors.textSecondary }]}>Deposit</Text>
                      <Text style={[styles.placementValue, { color: colors.text }]}>
                        ${placement.deposit_amount.toFixed(2)}
                      </Text>
                    </View>
                  )}

                  {placement.pickup_date && (
                    <View style={styles.placementDetail}>
                      <MaterialCommunityIcons name="calendar-check" size={18} color={colors.accent} />
                      <Text style={[styles.placementLabel, { color: colors.textSecondary }]}>Pickup Date</Text>
                      <Text style={[styles.placementValue, { color: colors.text }]}>
                        {formatDate(placement.pickup_date)}
                      </Text>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>

            {/* Action Buttons */}
            <View style={styles.placementActions}>
              <Button
                mode="outlined"
                onPress={openPlacementForm}
                style={[styles.placementBtn, { borderColor: colors.accent }]}
                textColor={colors.accent}
                icon="pencil"
              >
                Edit Placement
              </Button>
              <Button
                mode="outlined"
                onPress={handleRemovePlacement}
                style={[styles.placementBtn, { borderColor: colors.error }]}
                textColor={colors.error}
                icon="delete-outline"
              >
                Remove
              </Button>
            </View>

            {/* Generate Contract Button */}
            <Button
              mode="contained"
              onPress={() => router.push(`/contract-preview?puppy_id=${id}`)}
              style={[styles.contractBtn, { backgroundColor: colors.primary }]}
              contentStyle={{ paddingVertical: 6 }}
              icon="file-document-edit"
            >
              Generate Contract
            </Button>
          </>
        ) : showPlacementForm ? (
          <Card style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Card.Content>
              <Text variant="labelMedium" style={{ color: colors.text, marginBottom: 8 }}>
                Assign Buyer
              </Text>

              {/* Buyer Picker */}
              <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Buyer</Text>
              {buyers.length === 0 ? (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    No buyers available.{' '}
                    <Text
                      style={{ color: colors.accent, textDecorationLine: 'underline' }}
                      onPress={() => router.push('/buyer/add')}
                    >
                      Add a buyer first.
                    </Text>
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                  <View style={styles.typeRow}>
                    {buyers.map((b) => (
                      <Chip
                        key={b.id}
                        mode={plBuyerId === b.id ? 'flat' : 'outlined'}
                        selected={plBuyerId === b.id}
                        onPress={() => setPlBuyerId(b.id)}
                        compact
                        style={[styles.typeChip, plBuyerId === b.id && { backgroundColor: colors.accent + '30' }]}
                        textStyle={{
                          color: plBuyerId === b.id ? colors.accent : colors.text,
                          fontSize: 12,
                        }}
                      >
                        {b.name}
                      </Chip>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Status */}
              <Text style={[styles.miniLabel, { color: colors.textSecondary, marginTop: 4 }]}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                <View style={styles.typeRow}>
                  {PLACEMENT_STATUSES.map((s) => (
                    <Chip
                      key={s}
                      mode={plStatus === s ? 'flat' : 'outlined'}
                      selected={plStatus === s}
                      onPress={() => setPlStatus(s)}
                      compact
                      style={[styles.typeChip, plStatus === s && { backgroundColor: colors.accent + '30' }]}
                      textStyle={{
                        color: plStatus === s ? colors.accent : colors.text,
                        fontSize: 12,
                      }}
                    >
                      {s}
                    </Chip>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.formRow}>
                <TextInput
                  mode="outlined" label="Deposit ($)"
                  value={plDeposit} onChangeText={setPlDeposit}
                  keyboardType="decimal-pad"
                  style={[styles.formInput, { flex: 1 }]}
                  outlineStyle={{ borderColor: colors.border }}
                  activeOutlineColor={colors.accent}
                  dense
                />
                <TextInput
                  mode="outlined" label="Price ($)"
                  value={plPrice} onChangeText={setPlPrice}
                  keyboardType="decimal-pad"
                  style={[styles.formInput, { flex: 1 }]}
                  outlineStyle={{ borderColor: colors.border }}
                  activeOutlineColor={colors.accent}
                  dense
                />
              </View>

              <TextInput
                mode="outlined" label="Pickup Date (YYYY-MM-DD)"
                value={plPickupDate} onChangeText={setPlPickupDate}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
                activeOutlineColor={colors.accent}
                dense
              />

              <View style={styles.formBtnRow}>
                <Button
                  mode="text"
                  onPress={() => setShowPlacementForm(false)}
                  textColor={colors.textSecondary}
                  compact
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSavePlacement}
                  loading={plSaving}
                  disabled={plSaving || !plBuyerId}
                  style={{ backgroundColor: colors.accent }}
                  compact
                  icon="check"
                >
                  Save
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <Button
            mode="outlined"
            onPress={openPlacementForm}
            style={[styles.placementBtn, { borderColor: colors.accent }]}
            textColor={colors.accent}
            icon="account-plus"
          >
            Assign Buyer
          </Button>
        )}

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <Button
            mode="contained"
            onPress={() => router.push(`/puppy/${puppy.id}/edit`)}
            style={[styles.editBtn, { backgroundColor: colors.primary }]}
            contentStyle={{ paddingVertical: 6 }}
            icon="pencil"
          >
            Edit Puppy
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
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLeft: { flex: 1 },
  puppyName: { fontWeight: '700' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  sexChip: { height: 24 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12 },
  statInner: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  statNumber: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 20 },
  sectionTitle: { fontWeight: '600' },
  sectionCard: { borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  emptyCard: { borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  emptyInner: { alignItems: 'center', padding: 16 },
  notesLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  notesText: { fontSize: 15, lineHeight: 22 },
  // Growth chart
  chartCard: { borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  chartLegend: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chartLegendText: { fontSize: 11 },
  chartArea: { position: 'relative', marginVertical: 4 },
  gridLine: {
    position: 'absolute', left: 0, right: 0, height: 0,
    borderTopWidth: 1, borderStyle: 'dashed',
  },
  yLabel: {
    position: 'absolute', left: -50, top: -8, width: 44,
    textAlign: 'right', fontSize: 10,
  },
  chartLine: {
    position: 'absolute', height: 2,
    transformOrigin: 'left center',
  },
  chartDot: {
    position: 'absolute', width: 10, height: 10,
    borderRadius: 5, borderWidth: 2,
  },
  xAxisLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingLeft: CHART_PADDING.left, paddingRight: CHART_PADDING.right,
  },
  xLabel: { fontSize: 10, flex: 1 },
  // Lists
  listDivider: { marginVertical: 8 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listInfo: { flex: 1, gap: 2 },
  feedingTitleRow: { flexDirection: 'row', gap: 6 },
  feedChip: { height: 22 },
  // Inline forms
  formCard: { borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  formInput: { marginBottom: 8 },
  miniLabel: { fontSize: 13, marginBottom: 4, fontWeight: '500' },
  segmentedSm: { marginBottom: 8 },
  addBtn: { marginTop: 4, borderRadius: 8 },
  // Action buttons
  actionRow: { flexDirection: 'row', gap: 12, paddingTop: 20 },
  editBtn: { flex: 1, borderRadius: 10 },
  deleteBtn: { flex: 1, borderRadius: 10 },
  // Photo styles
  photoSection: { alignItems: 'center', marginBottom: 16 },
  headerPhoto: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover', backgroundColor: '#E5E7EB' },
  headerPhotoPlaceholder: { width: '100%', height: 200, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn: { marginTop: 6 },
  photoScroll: { marginBottom: 16 },
  photoWrapper: { marginRight: 10, position: 'relative' },
  photoThumb: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#E5E7EB' },
  photoRemoveBtn: { position: 'absolute', top: -8, right: -8, margin: 0, padding: 0 },
  // Placement styles
  placementSummary: { gap: 10 },
  placementDetail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placementLabel: { width: 70, fontSize: 13 },
  placementValue: { fontSize: 14, fontWeight: '500' },
  placementStatusChip: { height: 24 },
  placementActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  placementBtn: { flex: 1, borderRadius: 10 },
  contractBtn: { borderRadius: 10, marginBottom: 12 },
  // Form common
  typeScroll: { marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 6 },
  typeChip: { marginBottom: 0 },
  formBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
});
