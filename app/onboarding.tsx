import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shield,
  KeyRound,
  CheckCircle,
  Lock,
  Bus,
  MapPin,
  Eye,
  Bell,
  Home,
  ArrowRight,
  ChevronLeft,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_HOME_LOCATION } from '@/constants/route';
import { SavedAddress } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Design tokens ────────────────────────────────────────────────────────────
const NAVY        = '#0B3C5D';
const YELLOW      = '#FFC400';
const YELLOW_DARK = '#E5A500';
const WHITE       = '#FFFFFF';
const GRAY        = '#64748B';
const LIGHT       = '#F1F5F9';
const SUCCESS     = '#16A34A';
const ERROR       = '#DC2626';

type GeoResult = { label: string; coordinate: { latitude: number; longitude: number } };

// ── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [YELLOW, '#1565C0', SUCCESS, '#F97316', '#8B5CF6'];

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  startX: number;
  size: number;
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    authState,
    otpError,
    childIdError,
    setStep,
    validateChildId,
    requestOtp,
    verifyOtp,
    completeOnboarding,
    addAddress,
  } = useAuth();

  const [childCode, setChildCode] = useState('');
  const [contact, setContact]     = useState('');
  const [otpCode, setOtpCode]     = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<GeoResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Animated values ────────────────────────────────────────────────────────
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(30)).current;
  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;
  const checkScale  = useRef(new Animated.Value(0)).current;
  const busFloat    = useRef(new Animated.Value(0)).current;
  const glowPulse   = useRef(new Animated.Value(0.6)).current;

  const confettiPieces = useRef<ConfettiPiece[]>(
    Array.from({ length: 24 }).map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      startX: Math.random() * SCREEN_WIDTH,
      size: 6 + Math.random() * 6,
    }))
  ).current;

  // ── Step transitions ───────────────────────────────────────────────────────
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
    ]).start();
  }, [authState.step]);

  // ── Bus float on welcome ───────────────────────────────────────────────────
  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(busFloat, { toValue: -10, duration: 2200, useNativeDriver: true }),
        Animated.timing(busFloat, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.6, duration: 1800, useNativeDriver: true }),
      ])
    );
    float.start();
    glow.start();
    return () => { float.stop(); glow.stop(); };
  }, []);

  // ── Confetti on success ───────────────────────────────────────────────────
  useEffect(() => {
    if (authState.step === 'success') {
      checkScale.setValue(0);
      Animated.spring(checkScale, { toValue: 1, damping: 8, stiffness: 150, useNativeDriver: true }).start();
      confettiPieces.forEach((p) => {
        p.y.setValue(0); p.x.setValue(0); p.rotate.setValue(0); p.opacity.setValue(1);
        Animated.parallel([
          Animated.timing(p.y, { toValue: SCREEN_HEIGHT + 80, duration: 2200 + Math.random() * 800, useNativeDriver: true }),
          Animated.timing(p.x, { toValue: (Math.random() - 0.5) * 160, duration: 2200 + Math.random() * 800, useNativeDriver: true }),
          Animated.timing(p.rotate, { toValue: Math.random() * 12, duration: 2400, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: 2600, useNativeDriver: true }),
        ]).start();
      });
    }
  }, [authState.step]);

  // ── Geocoding ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (addressSearch.trim().length < 3) { setGeoResults([]); setShowSuggestions(false); return; }
    setGeoLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressSearch)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'BusNear/1.0' } }
        );
        const data = await res.json();
        if (cancelled) return;
        const results: GeoResult[] = data.map((item: any) => ({
          label: item.display_name,
          coordinate: { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) },
        }));
        setGeoResults(results);
        setShowSuggestions(results.length > 0);
      } catch {
        if (!cancelled) setGeoResults([]);
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    }, 400);
    return () => { cancelled = true; };
  }, [addressSearch]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const triggerShake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const pressBtn = useCallback((fn: () => void) => {
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.95, damping: 20, stiffness: 500, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, damping: 12, stiffness: 300, useNativeDriver: true }),
    ]).start(() => fn());
  }, [btnScale]);

  const handleChildIdSubmit = () => pressBtn(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const valid = await validateChildId(childCode);
    if (valid) {
      if (contact.trim()) await requestOtp(contact.trim(), 'email');
      else setStep('enter_otp');
    } else triggerShake();
  });

  const handleVerifyOtp = () => pressBtn(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!await verifyOtp(otpCode)) triggerShake();
  });

  const handleAddressSelect = (addr: GeoResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAddress(addr);
    setAddressSearch(addr.label);
    setShowSuggestions(false);
  };

  const handleAddressConfirm = () => pressBtn(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (selectedAddress) {
      await addAddress({
        id: `addr-${Date.now()}`,
        label: 'Home',
        address: selectedAddress.label,
        coordinate: selectedAddress.coordinate,
        alertsEnabled: true,
      });
    }
    setStep('success');
  });

  const handleComplete = () => pressBtn(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeOnboarding();
    router.replace('/');
  });

  // ── Progress dots ──────────────────────────────────────────────────────────
  const stepOrder = ['welcome', 'privacy', 'enter_id', 'enter_otp', 'home_address', 'success'];
  const stepIdx   = stepOrder.indexOf(authState.step);
  const showDots  = authState.step !== 'welcome' && authState.step !== 'success';

  const renderDots = () => (
    <View style={[styles.dotsRow, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={() => {
        const prev = stepOrder[stepIdx - 1];
        if (prev && prev !== 'welcome') setStep(prev as any);
        else if (prev === 'welcome') setStep('welcome' as any);
      }} style={styles.backIcon} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <ChevronLeft size={22} color={GRAY} strokeWidth={2.5} />
      </TouchableOpacity>
      <View style={styles.dots}>
        {['privacy', 'enter_id', 'enter_otp', 'home_address'].map((s, i) => {
          const done    = stepIdx > stepOrder.indexOf(s);
          const current = authState.step === s;
          return (
            <View
              key={s}
              style={[
                styles.dot,
                current && styles.dotActive,
                done && styles.dotDone,
              ]}
            />
          );
        })}
      </View>
      <View style={{ width: 34 }} />
    </View>
  );

  // ── Screens ────────────────────────────────────────────────────────────────
  const renderWelcome = () => (
    <Animated.View style={[styles.fill, { opacity: fadeAnim }]}>
      <View style={[styles.welcomeBg, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>

        {/* Top wordmark */}
        <View style={[styles.wordmarkRow, { marginTop: insets.top + 20 }]}>
          <View style={[styles.wordmarkDot, { backgroundColor: NAVY }]} />
          <Text style={[styles.wordmark, { color: NAVY }]}>BusNear</Text>
        </View>

        {/* Hero */}
        <View style={styles.heroCenter}>
          <Animated.View style={[styles.glowRing, { opacity: glowPulse, backgroundColor: NAVY }]} />
          <Animated.View style={[styles.busCircle, { backgroundColor: WHITE, transform: [{ translateY: busFloat }] }]}>
            <Bus size={52} color={NAVY} strokeWidth={2} />
          </Animated.View>

          <Text style={[styles.heroHeadline, { color: NAVY }]}>
            Know exactly{'\n'}where your bus is.
          </Text>
          <Text style={[styles.heroSub, { color: NAVY, opacity: 0.65 }]}>
            Real-time tracking for every parent.{'\n'}School bus, simplified.
          </Text>
        </View>

        {/* CTAs */}
        <View style={styles.welcomeBtns}>
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
            <TouchableOpacity
              style={styles.navyBtn}
              onPress={() => pressBtn(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep('privacy'); })}
              activeOpacity={1}
              testID="get-started-btn"
            >
              <Text style={styles.navyBtnText}>Get Started</Text>
              <ArrowRight size={18} color={WHITE} strokeWidth={2.5} />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => { setChildCode('CH-9F3K-2Q7M-8D1P'); setStep('enter_id'); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.ghostBtnText, { color: NAVY, opacity: 0.55 }]}>I have a demo code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderPrivacy = () => (
    <Animated.View style={[styles.fill, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {showDots && renderDots()}
      <View style={styles.innerScreen}>
        <View style={styles.innerTop}>
          <View style={[styles.iconRing, { backgroundColor: '#EEF2FF' }]}>
            <Shield size={32} color="#1565C0" strokeWidth={2} />
          </View>
          <Text style={styles.innerTitle}>Built for parents,{'\n'}secured by design.</Text>
          <Text style={styles.innerDesc}>
            Only parents with a school-issued ID can access their child's bus. Your data never leaves our servers.
          </Text>

          <View style={styles.featureCards}>
            {[
              { icon: Lock,    label: 'End-to-end encrypted',         bg: '#EEF2FF', color: '#1565C0' },
              { icon: Eye,     label: "Only your child's bus visible", bg: '#F0FDF4', color: SUCCESS },
              { icon: Bell,    label: 'Smart alerts, zero spam',       bg: '#FFFBEB', color: '#B45309' },
            ].map((item, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.featureCard,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [16 + i * 8, 0] }),
                    }],
                  },
                ]}
              >
                <View style={[styles.featureCardIcon, { backgroundColor: item.bg }]}>
                  <item.icon size={20} color={item.color} strokeWidth={2} />
                </View>
                <Text style={styles.featureCardLabel}>{item.label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={[styles.innerBottom, { paddingBottom: insets.bottom + 20 }]}>
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
            <TouchableOpacity
              style={styles.primaryYellowBtn}
              onPress={() => pressBtn(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep('enter_id'); })}
              activeOpacity={1}
            >
              <Text style={styles.primaryYellowBtnText}>Continue</Text>
              <ArrowRight size={18} color={NAVY} strokeWidth={2.5} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );

  const renderEnterId = () => (
    <Animated.View style={[styles.fill, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {showDots && renderDots()}
      <View style={styles.innerScreen}>
        <View style={styles.innerTop}>
          <View style={[styles.iconRing, { backgroundColor: '#FFFBEB' }]}>
            <KeyRound size={32} color={YELLOW_DARK} strokeWidth={2} />
          </View>
          <Text style={styles.innerTitle}>Enter your{'\n'}Child ID</Text>
          <Text style={styles.innerDesc}>
            Your school issued this code. It securely links you to your child's bus.
          </Text>

          <Animated.View style={[styles.inputGroup, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={[styles.inputWrap, childIdError ? styles.inputWrapError : null]}>
              <TextInput
                style={styles.textInput}
                value={childCode}
                onChangeText={setChildCode}
                placeholder="CH-XXXX-XXXX-XXXX"
                placeholderTextColor={GRAY}
                autoCapitalize="characters"
                autoCorrect={false}
                testID="child-id-input"
              />
            </View>
            {childIdError && <Text style={styles.errorMsg}>{childIdError}</Text>}

            <View style={[styles.inputWrap, { marginTop: 12 }]}>
              <TextInput
                style={styles.textInput}
                value={contact}
                onChangeText={setContact}
                placeholder="Email for verification (optional)"
                placeholderTextColor={GRAY}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="contact-input"
              />
            </View>
            <Text style={styles.hintText}>Demo: CH-9F3K-2Q7M-8D1P · leave email blank to skip OTP</Text>
          </Animated.View>
        </View>

        <View style={[styles.innerBottom, { paddingBottom: insets.bottom + 20 }]}>
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
            <TouchableOpacity
              style={[styles.primaryYellowBtn, !childCode.trim() && styles.btnDisabled]}
              onPress={handleChildIdSubmit}
              disabled={!childCode.trim()}
              activeOpacity={1}
              testID="submit-child-id-btn"
            >
              <Text style={[styles.primaryYellowBtnText, !childCode.trim() && styles.btnDisabledText]}>
                Continue
              </Text>
              {!!childCode.trim() && <ArrowRight size={18} color={NAVY} strokeWidth={2.5} />}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );

  const renderEnterOtp = () => (
    <Animated.View style={[styles.fill, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {showDots && renderDots()}
      <View style={styles.innerScreen}>
        <View style={styles.innerTop}>
          <View style={[styles.iconRing, { backgroundColor: '#F0FDF4' }]}>
            <Lock size={32} color={SUCCESS} strokeWidth={2} />
          </View>
          <Text style={styles.innerTitle}>Verify it's you</Text>
          <Text style={styles.innerDesc}>
            Enter the code we sent to your email to confirm your identity.
          </Text>

          <Animated.View style={[styles.inputGroup, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={[styles.inputWrap, styles.otpInputWrap, otpError ? styles.inputWrapError : null]}>
              <TextInput
                style={[styles.textInput, styles.otpInput]}
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="· · · · · ·"
                placeholderTextColor={GRAY}
                keyboardType="number-pad"
                maxLength={8}
                textAlign="center"
                testID="otp-input"
              />
            </View>
            {otpError && <Text style={styles.errorMsg}>{otpError}</Text>}
            <Text style={styles.hintText}>Check your email · Demo code: 123456</Text>
          </Animated.View>
        </View>

        <View style={[styles.innerBottom, { paddingBottom: insets.bottom + 20 }]}>
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
            <TouchableOpacity
              style={[styles.primaryYellowBtn, otpCode.length < 4 && styles.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={otpCode.length < 4}
              activeOpacity={1}
              testID="verify-otp-btn"
            >
              <Text style={[styles.primaryYellowBtnText, otpCode.length < 4 && styles.btnDisabledText]}>
                Verify
              </Text>
              {otpCode.length >= 4 && <ArrowRight size={18} color={NAVY} strokeWidth={2.5} />}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );

  const renderHomeAddress = () => (
    <Animated.View style={[styles.fill, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {showDots && renderDots()}
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.innerScreen, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerTop}>
          <View style={[styles.iconRing, { backgroundColor: '#F0FDF4' }]}>
            <Home size={32} color={SUCCESS} strokeWidth={2} />
          </View>
          <Text style={styles.innerTitle}>Where's home?</Text>
          <Text style={styles.innerDesc}>
            We'll alert you when the bus is getting close, so you're never caught off guard.
          </Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputWrap}>
              <MapPin size={18} color={GRAY} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={addressSearch}
                onChangeText={(t) => {
                  setAddressSearch(t);
                  setShowSuggestions(t.length > 0);
                  if (!t) setSelectedAddress(null);
                }}
                placeholder="Search your address..."
                placeholderTextColor={GRAY}
                testID="address-search-input"
              />
            </View>

            {geoLoading && (
              <View style={styles.suggestionsBox}>
                <Text style={styles.suggestingText}>Searching...</Text>
              </View>
            )}

            {showSuggestions && !geoLoading && geoResults.length > 0 && (
              <View style={styles.suggestionsBox}>
                {geoResults.map((addr, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.suggestionRow, i > 0 && styles.suggestionRowBorder]}
                    onPress={() => handleAddressSelect(addr)}
                    activeOpacity={0.7}
                  >
                    <MapPin size={15} color={GRAY} strokeWidth={2} />
                    <Text style={styles.suggestionText} numberOfLines={2}>{addr.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedAddress && (
              <View style={styles.selectedBox}>
                <View style={styles.selectedIconWrap}>
                  <MapPin size={20} color={ERROR} fill={`${ERROR}30`} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedText} numberOfLines={2}>{selectedAddress.label}</Text>
                  <Text style={styles.selectedCoords}>
                    {selectedAddress.coordinate.latitude.toFixed(4)}, {selectedAddress.coordinate.longitude.toFixed(4)}
                  </Text>
                </View>
                <View style={styles.selectedCheck}>
                  <Check size={14} color={SUCCESS} strokeWidth={3} />
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.addressFooter, { paddingBottom: insets.bottom + 16 }]}>
        <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
          <TouchableOpacity
            style={[styles.primaryYellowBtn, !selectedAddress && styles.btnDisabled]}
            onPress={handleAddressConfirm}
            disabled={!selectedAddress}
            activeOpacity={1}
            testID="confirm-address-btn"
          >
            <Text style={[styles.primaryYellowBtnText, !selectedAddress && styles.btnDisabledText]}>
              Confirm Location
            </Text>
            {selectedAddress && <ArrowRight size={18} color={NAVY} strokeWidth={2.5} />}
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            addAddress({ id: 'addr-default', label: 'Home', address: 'Default Location', coordinate: DEFAULT_HOME_LOCATION, alertsEnabled: true });
            setStep('success');
          }}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderSuccess = () => {
    const child = authState.linkedChildren[authState.linkedChildren.length - 1];
    return (
      <Animated.View style={[styles.fill, { opacity: fadeAnim }]}>
        {/* Confetti */}
        {confettiPieces.map((p, i) => (
          <Animated.View
            key={i}
            style={[
              styles.confetti,
              {
                width: p.size, height: p.size,
                backgroundColor: p.color,
                left: p.startX,
                borderRadius: i % 3 === 0 ? p.size / 2 : 2,
                transform: [
                  { translateY: p.y },
                  { translateX: p.x },
                  { rotate: p.rotate.interpolate({ inputRange: [0, 12], outputRange: ['0deg', '4320deg'] }) },
                ],
                opacity: p.opacity,
              },
            ]}
          />
        ))}

        <View style={[styles.successScreen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
          <Animated.View style={[styles.successCheck, { transform: [{ scale: checkScale }] }]}>
            <CheckCircle size={72} color={SUCCESS} strokeWidth={1.5} />
          </Animated.View>

          <Text style={styles.successTitle}>You're all set!</Text>
          <Text style={styles.successSub}>
            Time to track {child?.name ?? 'your child'}'s bus like a pro.
          </Text>

          {child && (
            <View style={styles.childCard}>
              <View style={[styles.childAvatar, { backgroundColor: child.avatarColor ?? YELLOW }]}>
                <Text style={styles.childAvatarLetter}>{child.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.childMeta}>{child.grade} · {child.school}</Text>
              </View>
              <View style={styles.busTag}>
                <Bus size={11} color={NAVY} strokeWidth={2.5} />
                <Text style={styles.busTagText}>{child.assignedBusId}</Text>
              </View>
            </View>
          )}

          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%', marginTop: 'auto' as any }}>
            <TouchableOpacity
              style={styles.primaryYellowBtn}
              onPress={handleComplete}
              activeOpacity={1}
              testID="complete-onboarding-btn"
            >
              <Text style={styles.primaryYellowBtnText}>Start Tracking</Text>
              <ArrowRight size={18} color={NAVY} strokeWidth={2.5} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    );
  };

  const renderStep = () => {
    switch (authState.step) {
      case 'welcome':      return renderWelcome();
      case 'privacy':      return renderPrivacy();
      case 'enter_id':     return renderEnterId();
      case 'enter_otp':    return renderEnterOtp();
      case 'home_address': return renderHomeAddress();
      case 'success':      return renderSuccess();
      default:             return renderWelcome();
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {renderStep()}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  fill: { flex: 1 },

  // ── Welcome ────────────────────────────────────────────────────────────────
  welcomeBg: {
    flex: 1,
    backgroundColor: YELLOW,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmarkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: YELLOW,
  },
  wordmark: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: WHITE,
    letterSpacing: 0.3,
  },
  heroCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.06,
  },
  busCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  heroHeadline: {
    fontSize: 34,
    fontWeight: '800' as const,
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 14,
  },
  welcomeBtns: {
    gap: 12,
    width: '100%',
  },
  navyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NAVY,
    paddingVertical: 17,
    borderRadius: 16,
    width: '100%',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  navyBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: WHITE,
    letterSpacing: 0.2,
  },
  ghostBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },

  // ── Progress dots ──────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
    backgroundColor: WHITE,
  },
  backIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 20,
    backgroundColor: NAVY,
  },
  dotDone: {
    backgroundColor: YELLOW_DARK,
  },

  // ── Inner screens ──────────────────────────────────────────────────────────
  innerScreen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  innerTop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  innerBottom: {
    width: '100%',
    gap: 8,
    paddingTop: 12,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  innerTitle: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: NAVY,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  innerDesc: {
    fontSize: 16,
    color: GRAY,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
    marginBottom: 32,
  },

  // ── Feature cards ──────────────────────────────────────────────────────────
  featureCards: {
    width: '100%',
    gap: 10,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  featureCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCardLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: NAVY,
    flex: 1,
  },

  // ── Inputs ─────────────────────────────────────────────────────────────────
  inputGroup: {
    width: '100%',
    gap: 0,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 56,
  },
  inputWrapError: {
    borderColor: ERROR,
    backgroundColor: '#FEF2F2',
  },
  otpInputWrap: {
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    color: NAVY,
    flex: 1,
    paddingVertical: 12,
    fontWeight: '500' as const,
  },
  otpInput: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 8,
    textAlign: 'center',
  },
  errorMsg: {
    fontSize: 13,
    color: ERROR,
    marginTop: 6,
    fontWeight: '500' as const,
  },
  hintText: {
    fontSize: 12,
    color: GRAY,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Address ────────────────────────────────────────────────────────────────
  suggestionsBox: {
    marginTop: 8,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  suggestingText: {
    fontSize: 14,
    color: GRAY,
    padding: 16,
    textAlign: 'center',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  suggestionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  suggestionText: {
    fontSize: 14,
    color: NAVY,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    fontSize: 13,
    color: NAVY,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  selectedCoords: {
    fontSize: 11,
    color: GRAY,
    marginTop: 2,
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 4,
  },
  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: GRAY,
    fontWeight: '500' as const,
  },

  // ── Buttons ────────────────────────────────────────────────────────────────
  primaryYellowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: YELLOW,
    paddingVertical: 17,
    borderRadius: 16,
    width: '100%',
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryYellowBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: NAVY,
    letterSpacing: 0.2,
  },
  btnDisabled: {
    backgroundColor: LIGHT,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnDisabledText: {
    color: '#9CA3AF',
  },

  // ── Success ────────────────────────────────────────────────────────────────
  confetti: {
    position: 'absolute',
    top: 0,
  },
  successScreen: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  successCheck: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: NAVY,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  successSub: {
    fontSize: 16,
    color: GRAY,
    textAlign: 'center',
    lineHeight: 24,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarLetter: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: WHITE,
  },
  childName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: NAVY,
  },
  childMeta: {
    fontSize: 13,
    color: GRAY,
    marginTop: 2,
  },
  busTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  busTagText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: NAVY,
  },
});
