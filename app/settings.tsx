import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Shield,
  MapPin,
  Clock,
  Bell,
  LogIn,
  AlertTriangle,
  Lock,
  Radius,
  Home,
  Plus,
  Pencil,
  Trash2,
  X,
  LogOut,
  Moon,
  Sun,
  Monitor,
  UserPlus,
  ChevronRight,
  Smartphone,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useBusTracking } from '@/context/BusTrackingContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme, ThemeMode } from '@/context/ThemeContext';
import { SavedAddress } from '@/types';
import { registerForPushNotifications } from '@/utils/notifications';

const RADIUS_OPTIONS = [150, 300, 450, 600];
const ETA_OPTIONS = [10, 5, 2];

const MOCK_ADDRESSES = [
  { label: '742 Evergreen Terrace', coordinate: { latitude: 37.3910, longitude: -122.0793 } },
  { label: '1234 Maple Drive', coordinate: { latitude: 37.3920, longitude: -122.0780 } },
  { label: '567 Oak Boulevard', coordinate: { latitude: 37.3900, longitude: -122.0800 } },
];

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: React.ElementType }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'Auto', icon: Monitor },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { alertSettings, updateAlertSettings } = useBusTracking();
  const { authState, addAddress, updateAddress, removeAddress, logout, addChildLink } = useAuth();
  const { colors, isDark, mode: themeMode, setThemeMode } = useTheme();
  const [addressSheetVisible, setAddressSheetVisible] = useState<boolean>(false);
  const [addChildVisible, setAddChildVisible] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [addressLabel, setAddressLabel] = useState<string>('');
  const [addressSearch, setAddressSearch] = useState<string>('');
  const [selectedCoord, setSelectedCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [childCode, setChildCode] = useState<string>('');
  const [childCodeError, setChildCodeError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setPushEnabled(true);
    }
  }, []);

  const toggleZoneAlert = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateAlertSettings({ ...alertSettings, zoneAlertEnabled: !alertSettings.zoneAlertEnabled });
  };

  const toggleEtaAlert = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateAlertSettings({ ...alertSettings, etaAlertEnabled: !alertSettings.etaAlertEnabled });
  };

  const toggleTwoMileAlert = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateAlertSettings({ ...alertSettings, twoMileAlertEnabled: !alertSettings.twoMileAlertEnabled });
  };

  const toggleBoardExitAlert = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateAlertSettings({ ...alertSettings, boardExitAlertEnabled: !alertSettings.boardExitAlertEnabled });
  };

  const toggleScheduleChangeAlert = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateAlertSettings({ ...alertSettings, scheduleChangeAlertEnabled: !alertSettings.scheduleChangeAlertEnabled });
  };

  const selectRadius = (radius: number) => {
    Haptics.selectionAsync();
    updateAlertSettings({ ...alertSettings, zoneRadius: radius });
  };

  const toggleEtaThreshold = (threshold: number) => {
    Haptics.selectionAsync();
    const current = alertSettings.etaThresholds;
    const updated = current.includes(threshold)
      ? current.filter((t) => t !== threshold)
      : [...current, threshold].sort((a, b) => b - a);
    updateAlertSettings({ ...alertSettings, etaThresholds: updated });
  };

  const openAddAddress = useCallback(() => {
    setEditingAddress(null);
    setAddressLabel('');
    setAddressSearch('');
    setSelectedCoord(null);
    setAddressSheetVisible(true);
  }, []);

  const openEditAddress = useCallback((addr: SavedAddress) => {
    setEditingAddress(addr);
    setAddressLabel(addr.label);
    setAddressSearch(addr.address);
    setSelectedCoord(addr.coordinate);
    setAddressSheetVisible(true);
  }, []);

  const handleSaveAddress = useCallback(() => {
    if (!addressLabel.trim() || !selectedCoord) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (editingAddress) {
      updateAddress({
        ...editingAddress,
        label: addressLabel,
        address: addressSearch,
        coordinate: selectedCoord,
      });
    } else {
      addAddress({
        id: `addr-${Date.now()}`,
        label: addressLabel,
        address: addressSearch,
        coordinate: selectedCoord,
        alertsEnabled: true,
      });
    }
    setAddressSheetVisible(false);
  }, [addressLabel, addressSearch, selectedCoord, editingAddress, addAddress, updateAddress]);

  const handleDeleteAddress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeAddress(id);
  }, [removeAddress]);

  const toggleAddressAlerts = useCallback((addr: SavedAddress) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateAddress({ ...addr, alertsEnabled: !addr.alertsEnabled });
  }, [updateAddress]);

  const handleAddChild = useCallback(async () => {
    const result = await addChildLink(childCode);
    if (result) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddChildVisible(false);
      setChildCode('');
      setChildCodeError(null);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setChildCodeError('Invalid code or child already linked.');
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [childCode, addChildLink, shakeAnim]);

  const handleEnablePush = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const token = await registerForPushNotifications();
    if (token) {
      setPushEnabled(true);
      console.log('[Settings] Push notifications enabled, token:', token);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Appearance</Text>

        <View style={[styles.themeRow, { backgroundColor: colors.surface }]}>
          {THEME_OPTIONS.map((opt) => {
            const isActive = themeMode === opt.mode;
            const Icon = opt.icon;
            return (
              <TouchableOpacity
                key={opt.mode}
                style={[
                  styles.themeOption,
                  { backgroundColor: isActive ? colors.primary : colors.surfaceSecondary, borderColor: isActive ? colors.primaryDark : 'transparent' },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setThemeMode(opt.mode);
                }}
                activeOpacity={0.8}
                testID={`theme-${opt.mode}`}
              >
                <Icon size={18} color={isActive ? colors.onPrimary : colors.textSecondary} />
                <Text style={[styles.themeOptionText, { color: isActive ? colors.onPrimary : colors.textSecondary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Linked Children</Text>

        {authState.linkedChildren.map((child) => (
          <View key={child.id} style={[styles.childCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.childAvatar, { backgroundColor: child.avatarColor }]}>
              <Text style={styles.childAvatarText}>{child.name[0]}</Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={[styles.childName, { color: colors.textPrimary }]}>{child.name}</Text>
              <Text style={[styles.childMeta, { color: colors.textSecondary }]}>
                {child.grade} • {child.school} • {child.assignedBusId}
              </Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addChildBtn, { borderColor: colors.border }]}
          onPress={() => {
            setChildCode('');
            setChildCodeError(null);
            setAddChildVisible(true);
          }}
          activeOpacity={0.8}
        >
          <UserPlus size={18} color={colors.info} />
          <Text style={[styles.addChildBtnText, { color: colors.info }]}>Link Another Child</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Alert Locations</Text>

        {authState.savedAddresses.map((addr) => (
          <View key={addr.id} style={[styles.addressCard, { backgroundColor: colors.surface }]}>
            <View style={styles.addressCardTop}>
              <View style={[styles.iconBg, { backgroundColor: isDark ? '#1A3D2A' : '#E8F8EE' }]}>
                <Home size={18} color={isDark ? '#4ADE80' : '#1B7A3D'} />
              </View>
              <View style={styles.addressInfo}>
                <Text style={[styles.addressLabel, { color: colors.textPrimary }]}>{addr.label}</Text>
                <Text style={[styles.addressText, { color: colors.textSecondary }]}>{addr.address}</Text>
              </View>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => openEditAddress(addr)}
                activeOpacity={0.7}
              >
                <Pencil size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: isDark ? '#3D1A1A' : '#FFF0F0' }]}
                onPress={() => handleDeleteAddress(addr.id)}
                activeOpacity={0.7}
              >
                <Trash2 size={14} color={colors.danger} />
              </TouchableOpacity>
            </View>
            <View style={[styles.addressToggle, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.addressToggleText, { color: colors.textSecondary }]}>Alerts for this location</Text>
              <Switch
                value={addr.alertsEnabled}
                onValueChange={() => toggleAddressAlerts(addr)}
                trackColor={{ false: colors.border, true: colors.busYellow }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addAddressBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={openAddAddress}
          activeOpacity={0.8}
        >
          <Plus size={18} color={colors.info} />
          <Text style={[styles.addAddressBtnText, { color: colors.info }]}>Add Address</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Push Notifications</Text>

        {!pushEnabled && Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.enablePushCard, { backgroundColor: isDark ? '#1E3A5F' : '#EEF2FF' }]}
            onPress={handleEnablePush}
            activeOpacity={0.8}
          >
            <Smartphone size={20} color={colors.info} />
            <View style={styles.enablePushContent}>
              <Text style={[styles.enablePushTitle, { color: colors.textPrimary }]}>Enable Push Notifications</Text>
              <Text style={[styles.enablePushDesc, { color: colors.textSecondary }]}>
                Get real-time alerts when your child boards, exits, or the bus is nearby.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: isDark ? '#1E3A5F' : '#EEF2FF' }]}>
              <Radius size={18} color={colors.info} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>2-Mile Proximity</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Push when bus is within 2 miles</Text>
            </View>
            <Switch
              value={alertSettings.twoMileAlertEnabled}
              onValueChange={toggleTwoMileAlert}
              trackColor={{ false: colors.border, true: colors.busYellow }}
              thumbColor={colors.white}
              testID="two-mile-alert-switch"
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: isDark ? '#1A3D2A' : '#E8F8EE' }]}>
              <MapPin size={18} color={isDark ? '#4ADE80' : '#1B7A3D'} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Zone Alert</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Push when bus enters your zone</Text>
            </View>
            <Switch
              value={alertSettings.zoneAlertEnabled}
              onValueChange={toggleZoneAlert}
              trackColor={{ false: colors.border, true: colors.busYellow }}
              thumbColor={colors.white}
              testID="zone-alert-switch"
            />
          </View>
          {alertSettings.zoneAlertEnabled && (
            <View style={[styles.optionGroup, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>Alert Radius</Text>
              <View style={styles.optionRow}>
                {RADIUS_OPTIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.optionChip,
                      { backgroundColor: colors.surfaceSecondary },
                      alertSettings.zoneRadius === r && { backgroundColor: colors.busYellowLight, borderColor: colors.busYellow },
                    ]}
                    onPress={() => selectRadius(r)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionChipText,
                      { color: colors.textSecondary },
                      alertSettings.zoneRadius === r && { color: isDark ? colors.busYellow : '#9A7200' },
                    ]}>
                      {r}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: isDark ? '#3D3000' : '#FFF3D0' }]}>
              <Clock size={18} color={isDark ? '#FBBF24' : '#9A7200'} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>ETA Alerts</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Push at specific ETA thresholds</Text>
            </View>
            <Switch
              value={alertSettings.etaAlertEnabled}
              onValueChange={toggleEtaAlert}
              trackColor={{ false: colors.border, true: colors.busYellow }}
              thumbColor={colors.white}
              testID="eta-alert-switch"
            />
          </View>
          {alertSettings.etaAlertEnabled && (
            <View style={[styles.optionGroup, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>Alert when ETA is</Text>
              <View style={styles.optionRow}>
                {ETA_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.optionChip,
                      { backgroundColor: colors.surfaceSecondary },
                      alertSettings.etaThresholds.includes(t) && { backgroundColor: colors.busYellowLight, borderColor: colors.busYellow },
                    ]}
                    onPress={() => toggleEtaThreshold(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionChipText,
                      { color: colors.textSecondary },
                      alertSettings.etaThresholds.includes(t) && { color: isDark ? colors.busYellow : '#9A7200' },
                    ]}>
                      {t} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: isDark ? '#1A3D2A' : '#E8F8EE' }]}>
              <LogIn size={18} color={isDark ? '#4ADE80' : '#1B7A3D'} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Board / Exit</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Push when child boards or exits</Text>
            </View>
            <Switch
              value={alertSettings.boardExitAlertEnabled}
              onValueChange={toggleBoardExitAlert}
              trackColor={{ false: colors.border, true: colors.busYellow }}
              thumbColor={colors.white}
              testID="board-exit-alert-switch"
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBg, { backgroundColor: isDark ? '#3D2A00' : '#FFF3E0' }]}>
              <AlertTriangle size={18} color={isDark ? '#FBBF24' : '#C45D00'} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Schedule Changes</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Delays, route changes, cancellations</Text>
            </View>
            <Switch
              value={alertSettings.scheduleChangeAlertEnabled}
              onValueChange={toggleScheduleChangeAlert}
              trackColor={{ false: colors.border, true: colors.busYellow }}
              thumbColor={colors.white}
              testID="schedule-change-alert-switch"
            />
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Privacy & Security</Text>

        <View style={[styles.privacyCard, { backgroundColor: isDark ? '#1E3A5F' : '#EEF2FF' }]}>
          <Lock size={18} color={colors.info} />
          <View style={styles.privacyContent}>
            <Text style={[styles.privacyTitle, { color: colors.textPrimary }]}>Your privacy is protected.</Text>
            <Text style={[styles.privacyBody, { color: colors.textSecondary }]}>
              Parents must obtain a private ID number, which grants access to their child's bus only.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: isDark ? '#3D1A1A' : '#FFF0F0' }]}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logout();
            router.replace('/onboarding' as never);
          }}
          activeOpacity={0.8}
        >
          <LogOut size={18} color={colors.danger} />
          <Text style={[styles.logoutBtnText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={addressSheetVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {editingAddress ? 'Edit Address' : 'Add Address'}
              </Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setAddressSheetVisible(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInput}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Label</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                value={addressLabel}
                onChangeText={setAddressLabel}
                placeholder="e.g., Home, Babysitter"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.modalInput}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Address</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                value={addressSearch}
                onChangeText={setAddressSearch}
                placeholder="Search address..."
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {addressSearch.length > 0 && !selectedCoord && (
              <View style={[styles.modalSuggestions, { backgroundColor: colors.surfaceSecondary }]}>
                {MOCK_ADDRESSES.filter((a) =>
                  a.label.toLowerCase().includes(addressSearch.toLowerCase())
                ).map((addr, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.modalSuggestionRow, { borderBottomColor: colors.borderLight }]}
                    onPress={() => {
                      setAddressSearch(addr.label);
                      setSelectedCoord(addr.coordinate);
                    }}
                    activeOpacity={0.7}
                  >
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={[styles.modalSuggestionText, { color: colors.textPrimary }]}>{addr.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalSaveBtn, (!addressLabel.trim() || !selectedCoord) && styles.modalSaveBtnDisabled]}
              onPress={handleSaveAddress}
              disabled={!addressLabel.trim() || !selectedCoord}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSaveBtnText}>
                {editingAddress ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={addChildVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Link Another Child</Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setAddChildVisible(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.addChildDesc, { color: colors.textSecondary }]}>
              Enter the Private Child ID provided by your school to link another child.
            </Text>

            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <TextInput
                style={[
                  styles.modalTextInput,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary },
                  childCodeError && { borderColor: colors.errorBorder, backgroundColor: colors.errorBg },
                ]}
                value={childCode}
                onChangeText={(text) => {
                  setChildCode(text);
                  setChildCodeError(null);
                }}
                placeholder="CH-XXXX-XXXX-XXXX"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </Animated.View>

            {childCodeError && (
              <Text style={[styles.childCodeError, { color: colors.errorText }]}>{childCodeError}</Text>
            )}

            <Text style={[styles.childCodeHint, { color: colors.textTertiary }]}>
              Try: CH-4H7L-9R2N-5K3M
            </Text>

            <TouchableOpacity
              style={[styles.modalSaveBtn, !childCode.trim() && styles.modalSaveBtnDisabled]}
              onPress={handleAddChild}
              disabled={!childCode.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSaveBtnText}>Link Child</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 16,
    padding: 6,
    marginBottom: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  childInfo: {
    flex: 1,
    marginLeft: 12,
  },
  childName: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  childMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  addChildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addChildBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  addressCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  addressCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  addressText: {
    fontSize: 13,
    marginTop: 1,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  addressToggleText: {
    fontSize: 13,
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addAddressBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  enablePushCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  enablePushContent: {
    flex: 1,
  },
  enablePushTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  enablePushDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  optionGroup: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  privacyCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  privacyBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInput: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  modalTextInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  modalSuggestions: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  modalSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  modalSuggestionText: {
    fontSize: 15,
  },
  modalSaveBtn: {
    backgroundColor: '#FFC400',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSaveBtnDisabled: {
    opacity: 0.4,
  },
  modalSaveBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#111827',
  },
  addChildDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  childCodeError: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  childCodeHint: {
    fontSize: 13,
    marginTop: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
});
