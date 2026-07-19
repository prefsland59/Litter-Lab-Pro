import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useAppTheme } from '../src/theme/ThemeContext';
import { getRowsByField, insertRow } from '../src/db/database';
import type { Buyer, Placement, Puppy, Litter, Dog } from '../src/db/schema';

function formatDateNice(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function ContractPreviewScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { puppy_id } = useLocalSearchParams<{ puppy_id: string }>();

  const [loading, setLoading] = useState(true);
  const [contractContent, setContractContent] = useState('');
  const [placementId, setPlacementId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!puppy_id) { setLoading(false); return; }
    try {
      const pid = Number(puppy_id);

      // Load placement
      const placements = await getRowsByField<Placement>('placements', 'puppy_id', [pid]);
      const placement = placements.length > 0 ? placements[0] : null;
      if (placement) setPlacementId(placement.id);

      // Load puppy
      const puppies = await getRowsByField<Puppy>('puppies', 'id', [pid]);
      const puppy = puppies.length > 0 ? puppies[0] : null;

      // Load buyer
      let buyer: Buyer | null = null;
      if (placement) {
        const buyers = await getRowsByField<Buyer>('buyers', 'id', [placement.buyer_id]);
        buyer = buyers.length > 0 ? buyers[0] : null;
      }

      // Load litter & dam for breeder context
      let damName = 'Breeder';
      if (puppy) {
        const litters = await getRowsByField<Litter>('litters', 'id', [puppy.litter_id]);
        if (litters.length > 0) {
          const dogs = await getRowsByField<Dog>('dogs', 'id', [litters[0].dam_id]);
          if (dogs.length > 0) damName = dogs[0].name;
        }
      }

      const buyerName = buyer?.name || 'Buyer';
      const puppyName = puppy?.name_or_id || `Puppy #${pid}`;

      const template = `========================================
PUPPY PURCHASE AGREEMENT — SAMPLE TEMPLATE
========================================

THIS IS A SAMPLE CONTRACT TEMPLATE ONLY.
THE APP DOES NOT PROVIDE LEGAL ADVICE.
CONSULT AN ATTORNEY BEFORE USING.

========================================

Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Breeder/Seller: ${damName}'s Program (French Bulldog Breeder)
Buyer: ${buyerName}

Puppy: ${puppyName}
Sex: ${puppy?.sex || 'N/A'}
Color: ${puppy?.color || 'N/A'}
${placement?.price != null ? `Purchase Price: $${placement.price.toFixed(2)}` : 'Purchase Price: TBD'}
${placement?.deposit_amount != null ? `Deposit Paid: $${placement.deposit_amount.toFixed(2)}` : 'Deposit: TBD'}
${placement?.pickup_date ? `Pickup / Delivery Date: ${formatDateNice(placement.pickup_date)}` : 'Pickup Date: TBD'}

========================================
TERMS AND CONDITIONS (SAMPLE)
========================================

1. HEALTH GUARANTEE
   The puppy is guaranteed to be in good health at the time of delivery. Buyer agrees to have the puppy examined by a licensed veterinarian within 72 hours of pickup.

2. SPAY/NEUTER AGREEMENT
   Unless otherwise agreed in writing, this puppy is sold as a companion pet and must be spayed/neutered by 12 months of age.

3. RETURN POLICY
   If Buyer is unable to keep the puppy, the Breeder has first right of refusal. The puppy shall not be surrendered to a shelter.

4. REGISTRATION
   Registration papers (if applicable) will be provided upon proof of spay/neuter or as otherwise agreed.

========================================
SIGNATURES
========================================

Breeder: ___________________________  Date: ___________

Buyer:   ___________________________  Date: ___________

========================================
DISCLAIMER: These are sample templates only.
The app does not provide legal advice. Consult
a qualified attorney for legally binding contracts.
========================================`;

      setContractContent(template);
    } catch (err) {
      console.error('Failed to load contract data:', err);
    } finally {
      setLoading(false);
    }
  }, [puppy_id]);

  useFocusEffect(
    useCallback(() => {
      if (puppy_id) loadData();
    }, [puppy_id, loadData]),
  );

  const handleShareContract = async () => {
    try {
      const filePath = `${FileSystem.Paths.cache.uri}contract.txt`;
      await FileSystem.writeAsStringAsync(filePath, contractContent);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/plain',
          dialogTitle: 'Export Contract',
        });
      } else {
        Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
      }
    } catch (err) {
      console.error('Failed to share:', err);
      Alert.alert('Error', 'Failed to export contract.');
    }
  };

  const handleSaveContract = async () => {
    try {
      await insertRow('contracts', {
        placement_id: placementId,
        template_type: 'purchase_agreement',
        content: contractContent,
      } as Record<string, unknown>);
      Alert.alert('Saved', 'Contract saved to records.');
    } catch (err) {
      console.error('Failed to save contract:', err);
      Alert.alert('Error', 'Failed to save contract.');
    }
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Legal Disclaimer — prominent */}
        <Card style={[styles.disclaimerCard, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
          <Card.Content>
            <View style={styles.disclaimerRow}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={colors.warning} />
              <Text style={[styles.disclaimerText, { color: colors.warning }]}>
                LEGAL DISCLAIMER: These are sample templates only. The app does not provide legal advice. Consult a qualified attorney before using any contract.
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Contract Content */}
        <Card style={[styles.contractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Card.Content>
            <Text
              variant="bodySmall"
              style={[styles.contractMono, { color: colors.text }]}
              selectable
            >
              {contractContent}
            </Text>
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <Button
            mode="contained"
            onPress={handleShareContract}
            style={{ backgroundColor: colors.accent, flex: 1 }}
            icon="share-variant"
            contentStyle={{ paddingVertical: 6 }}
          >
            Export as Text
          </Button>
          <Button
            mode="outlined"
            onPress={handleSaveContract}
            style={[styles.saveBtn, { borderColor: colors.accent }]}
            textColor={colors.accent}
            icon="content-save"
            contentStyle={{ paddingVertical: 6 }}
          >
            Save
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
  disclaimerCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  contractCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  contractMono: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBtn: {
    borderRadius: 10,
    borderWidth: 1,
  },
});
