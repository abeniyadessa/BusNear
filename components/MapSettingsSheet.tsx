import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
} from 'react-native';
import { X, Route, MapPin, Target, Compass } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { MapSettings } from '@/types';

interface MapSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  settings: MapSettings;
  onUpdate: (settings: MapSettings) => void;
}

export default function MapSettingsSheet({
  visible,
  onClose,
  settings,
  onUpdate,
}: MapSettingsSheetProps) {
  const toggle = (key: keyof MapSettings) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Map Settings</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              testID="close-map-settings"
            >
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Layers</Text>

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBg, { backgroundColor: '#EEF2FF' }]}>
                  <Route size={16} color={Colors.info} />
                </View>
                <Text style={styles.rowLabel}>Route Line</Text>
              </View>
              <Switch
                value={settings.showRouteLine}
                onValueChange={() => toggle('showRouteLine')}
                trackColor={{ false: Colors.border, true: Colors.busYellow }}
                thumbColor={Colors.white}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBg, { backgroundColor: '#E8F8EE' }]}>
                  <MapPin size={16} color="#1B7A3D" />
                </View>
                <Text style={styles.rowLabel}>Stop Markers</Text>
              </View>
              <Switch
                value={settings.showStopMarkers}
                onValueChange={() => toggle('showStopMarkers')}
                trackColor={{ false: Colors.border, true: Colors.busYellow }}
                thumbColor={Colors.white}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBg, { backgroundColor: Colors.busYellowLight }]}>
                  <Target size={16} color="#9A7200" />
                </View>
                <Text style={styles.rowLabel}>Alert Zone Ring</Text>
              </View>
              <Switch
                value={settings.showAlertZone}
                onValueChange={() => toggle('showAlertZone')}
                trackColor={{ false: Colors.border, true: Colors.busYellow }}
                thumbColor={Colors.white}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Camera</Text>

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBg, { backgroundColor: '#F3E8FF' }]}>
                  <Compass size={16} color="#7C3AED" />
                </View>
                <View>
                  <Text style={styles.rowLabel}>3D Follow</Text>
                  <Text style={styles.rowHint}>Tilted camera behind bus</Text>
                </View>
              </View>
              <Switch
                value={settings.follow3D}
                onValueChange={() => toggle('follow3D')}
                trackColor={{ false: Colors.border, true: Colors.busYellow }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textPrimary,
  },
  rowHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
});
