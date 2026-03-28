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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shield,
  KeyRound,
  CheckCircle,
  ChevronRight,
  Lock,
  Bus,
  MapPin,
  Eye,
  Bell,
  Home,
  Sparkles,
  Star,
  Heart,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_HOME_LOCATION } from '@/constants/route';
import { SavedAddress } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type GeoResult = { label: string; coordinate: { latitude: number; longitude: number } };

const CONFETTI_COLORS = ['#FFC400', '#1565C0', '#16A34A', '#DC2626', '#0B3C5D', '#F59E0B'];

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  color: string;
  startX: number;
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

  const [childCode, setChildCode] = useState<string>('');
  const [contact, setContact] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [addressSearch, setAddressSearch] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<GeoResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState<boolean>(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const busFloat = useRef(new Animated.Value(0)).current;
  const busBounce = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const mascotWave = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const confettiPieces = useRef<ConfettiPiece[]>(
    Array.from({ length: 20 }).map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      startX: Math.random() * SCREEN_WIDTH,
    }))
  ).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        damping: 18,
        stiffness: 160,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        stiffness: 160,
        useNativeDriver: true,
      }),
    ]).start();

    const stepOrder = ['welcome', 'privacy', 'enter_id', 'enter_otp', 'home_address', 'success'];
    const idx = stepOrder.indexOf(authState.step);
    Animated.spring(progressWidth, {
      toValue: idx / (stepOrder.length - 1),
      damping: 20,
      stiffness: 120,
      useNativeDriver: false,
    }).start();
  }, [authState.step]);

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(busFloat, { toValue: -12, duration: 1800, useNativeDriver: true }),
        Animated.timing(busFloat, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    float.start();

    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(mascotWave, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(mascotWave, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.delay(2000),
      ])
    );
    wave.start();

    const sparkleLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.delay(1500),
        ])
      );

    sparkleLoop(sparkle1, 0).start();
    sparkleLoop(sparkle2, 500).start();
    sparkleLoop(sparkle3, 1000).start();

    return () => {
      float.stop();
      wave.stop();
    };
  }, []);

  const triggerConfetti = useCallback(() => {
    confettiPieces.forEach((piece) => {
      piece.y.setValue(0);
      piece.x.setValue(0);
      piece.rotate.setValue(0);
      piece.scale.setValue(1);
      piece.opacity.setValue(1);

      Animated.parallel([
        Animated.timing(piece.y, {
          toValue: SCREEN_HEIGHT + 100,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(piece.x, {
          toValue: (Math.random() - 0.5) * 200,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotate, {
          toValue: Math.random() * 10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(piece.opacity, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [confettiPieces]);

  const triggerShake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const animateButtonPress = useCallback((onComplete: () => void) => {
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.94, damping: 15, stiffness: 400, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, damping: 10, stiffness: 300, useNativeDriver: true }),
    ]).start(() => onComplete());
  }, [btnScale]);

  const handleChildIdSubmit = () => {
    animateButtonPress(async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const valid = await validateChildId(childCode);
      if (valid) {
        if (contact.trim()) {
          await requestOtp(contact.trim(), 'email');
        } else {
          setStep('enter_otp');
        }
      } else {
        triggerShake();
      }
    });
  };

  const handleVerifyOtp = () => {
    animateButtonPress(async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await verifyOtp(otpCode);
      if (!result) {
        triggerShake();
      }
    });
  };

  const handleAddressSelect = (addr: GeoResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAddress(addr);
    setAddressSearch(addr.label);
    setShowSuggestions(false);
  };

  const handleAddressConfirm = () => {
    animateButtonPress(async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (selectedAddress) {
        const newAddress: SavedAddress = {
          id: `addr-${Date.now()}`,
          label: 'Home',
          address: selectedAddress.label,
          coordinate: selectedAddress.coordinate,
          alertsEnabled: true,
        };
        await addAddress(newAddress);
      }
      setStep('success');
    });
  };

  const handleComplete = () => {
    animateButtonPress(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      completeOnboarding();
      router.replace('/');
    });
  };

  useEffect(() => {
    if (authState.step === 'success') {
      checkScale.setValue(0);
      Animated.spring(checkScale, {
        toValue: 1,
        damping: 8,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
      triggerConfetti();
    }
  }, [authState.step]);

  useEffect(() => {
    let cancelled = false;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (addressSearch.trim().length < 3) {
      setGeoResults([]);
      setShowSuggestions(false);
      return;
    }
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

  const stepOrder: string[] = ['welcome', 'privacy', 'enter_id', 'enter_otp', 'home_address', 'success'];
  const stepIndex = stepOrder.indexOf(authState.step);

  const waveRotate = mascotWave.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  const renderMascotBus = (size: number = 120) => (
    <Animated.View style={[styles.mascotContainer, { transform: [{ translateY: busFloat }] }]}>
      <View style={[styles.mascotBus, { width: size, height: size }]}>
        <View style={styles.busBody}>
          <Bus size={size * 0.45} color={Colors.navy} strokeWidth={2} />
        </View>
        <Animated.View style={[styles.mascotEyeWink, { transform: [{ rotate: waveRotate }] }]}>
          <Sparkles size={20} color={Colors.white} />
        </Animated.View>
      </View>
      <Animated.View style={[styles.sparklePos1, { opacity: sparkle1 }]}>
        <Star size={14} color={Colors.primary} fill={Colors.primary} />
      </Animated.View>
      <Animated.View style={[styles.sparklePos2, { opacity: sparkle2 }]}>
        <Star size={10} color={Colors.accent} fill={Colors.accent} />
      </Animated.View>
      <Animated.View style={[styles.sparklePos3, { opacity: sparkle3 }]}>
        <Star size={12} color={Colors.success} fill={Colors.success} />
      </Animated.View>
    </Animated.View>
  );

  const renderProgressBar = () => {
    if (authState.step === 'welcome' || authState.step === 'success') return null;

    const barWidth = progressWidth.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={[styles.progressContainer, { paddingTop: insets.top + 12 }]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: barWidth }]} />
        </View>
      </View>
    );
  };

  const renderWelcome = () => (
    <Animated.View style={[styles.screenFull, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.welcomeScreen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.welcomeTopSection}>
          {renderMascotBus(140)}
          <Text style={styles.welcomeHeadline}>
            Track your child's{'\n'}bus in real time!
          </Text>
          <Text style={styles.welcomeSubtext}>
            Know exactly when the bus arrives — no more waiting in the cold.
          </Text>
        </View>

        <View style={styles.welcomeBottomSection}>
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                animateButtonPress(() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setStep('privacy');
                });
              }}
              activeOpacity={1}
              testID="get-started-btn"
            >
              <Text style={styles.primaryBtnText}>GET STARTED</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => {
              setChildCode('CH-9F3K-2Q7M-8D1P');
              setStep('enter_id');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineBtnText}>I HAVE A DEMO CODE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderPrivacy = () => (
    <Animated.View style={[styles.screenFull, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.contentScreen}>
        <View style={styles.contentTop}>
          <View style={styles.iconBubble}>
            <Shield size={44} color={Colors.accent} />
          </View>
          <Text style={styles.screenTitle}>Your child is safe{'\n'}with us</Text>
          <Text style={styles.screenDesc}>
            Only parents with a school-issued ID can track their child's bus. No exceptions.
          </Text>

          <View style={styles.featureList}>
            {[
              { icon: Lock, text: 'End-to-end encrypted', color: Colors.accent },
              { icon: Eye, text: 'Only your child\'s bus visible', color: Colors.navy },
              { icon: Bell, text: 'Smart alerts, no spam', color: Colors.primary },
            ].map((item, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.featureRow,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20 + i * 10, 0],
                      }),
                    }],
                  },
                ]}
              >
                <View style={[styles.featureIcon, { backgroundColor: `${item.color}18` }]}>
                  <item.icon size={22} color={item.color} />
                </View>
                <Text style={styles.featureText}>{item.text}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={[styles.contentBottom, { paddingBottom: insets.bottom + 16 }]}>
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
            <TouchableOpacity
              style={styles.yellowBtn}
              onPress={() => {
                animateButtonPress(() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep('enter_id');
                });
              }}
              activeOpacity={1}
            >
              <Text style={styles.yellowBtnText}>CONTINUE</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );

  const renderEnterId = () => (
    <Animated.View style={[styles.screenFull, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.contentScreen}>
        <View style={styles.contentTop}>
          <View style={[styles.iconBubble, { backgroundColor: Colors.accentLight }]}>
            <KeyRound size={40} color={Colors.accent} />
          </View>
          <Text style={styles.screenTitle}>Enter your{'\n'}Private Child ID</Text>
          <Text style={styles.screenDesc}>
            Your school gave you this code. It links your account to your child's bus.
          </Text>

          <Animated.View style={[styles.inputSection, { transform: [{ translateX: shakeAnim }] }]}>
            <TextInput
              style={[styles.textInput, childIdError ? styles.inputError : null]}
              value={childCode}
              onChangeText={setChildCode}
              placeholder="CH-XXXX-XXXX-XXXX"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              testID="child-id-input"
            />
            {childIdError && (
              <View style={styles.errorRow}>
                <Text style={styles.errorText}>{childIdError}</Text>
              </View>
            )}
            <TextInput
              style={[styles.textInput, { marginTop: 12 }]}
              value={contact}
              onChangeText={setContact}
              placeholder="Your email (for OTP verification)"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="contact-input"
            />
            <Text style={styles.hintText}>Demo: CH-9F3K-2Q7M-8D1P · leave email blank to skip OTP</Text>
          </Animated.View>
        </View>

        <View style={[styles.contentBottom, { paddingBottom: insets.bottom + 16 }]}>
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
            <TouchableOpacity
              style={[styles.yellowBtn, !childCode.trim() && styles.primaryBtnDisabled]}
              onPress={handleChildIdSubmit}
              disabled={!childCode.trim()}
              activeOpacity={1}
              testID="submit-child-id-btn"
            >
              <Text style={[styles.yellowBtnText, !childCode.trim() && styles.primaryBtnTextDisabled]}>CHECK</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('privacy')}>
            <Text style={styles.backBtnText}>BACK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderEnterOtp = () => (
    <Animated.View style={[styles.screenFull, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.contentScreen}>
        <View style={styles.contentTop}>
          <View style={[styles.iconBubble, { backgroundColor: `${Colors.navy}15` }]}>
            <Lock size={40} color={Colors.navy} />
          </View>
          <Text style={styles.screenTitle}>Verify your{'\n'}identity</Text>
          <Text style={styles.screenDesc}>
            Enter the 6-digit code to confirm it's really you.
          </Text>

          <Animated.View style={[styles.inputSection, { transform: [{ translateX: shakeAnim }] }]}>
            <TextInput
              style={[styles.textInput, styles.otpInput, otpError ? styles.inputError : null]}
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="000000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={8}
              textAlign="center"
              testID="otp-input"
            />
            {otpError && (
              <View style={styles.errorRow}>
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            )}
            <Text style={styles.hintText}>Check your email for the code · Demo: 123456</Text>
          </Animated.View>
        </View>

        <View style={[styles.contentBottom, { paddingBottom: insets.bottom + 16 }]}>
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
            <TouchableOpacity
              style={[styles.yellowBtn, otpCode.length < 4 && styles.primaryBtnDisabled]}
              onPress={handleVerifyOtp}
              disabled={otpCode.length < 4}
              activeOpacity={1}
              testID="verify-otp-btn"
            >
              <Text style={[styles.yellowBtnText, otpCode.length < 6 && styles.primaryBtnTextDisabled]}>VERIFY</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('enter_id')}>
            <Text style={styles.backBtnText}>BACK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderHomeAddress = () => (
    <Animated.View style={[styles.screenFull, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.contentScreen}>
        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scrollContentInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentTopScroll}>
            <View style={[styles.iconBubble, { backgroundColor: Colors.successBg }]}>
              <Home size={40} color={Colors.success} />
            </View>
            <Text style={styles.screenTitle}>Where do you{'\n'}live?</Text>
            <Text style={styles.screenDesc}>
              We'll alert you when the bus is near your home.
            </Text>

            <View style={styles.inputSection}>
              <TextInput
                style={styles.textInput}
                value={addressSearch}
                onChangeText={(text) => {
                  setAddressSearch(text);
                  setShowSuggestions(text.length > 0);
                  if (!text) setSelectedAddress(null);
                }}
                placeholder="Search your address..."
                placeholderTextColor={Colors.textTertiary}
                testID="address-search-input"
              />
            </View>

            {geoLoading && (
              <View style={styles.suggestionsCard}>
                <Text style={[styles.suggestionLabel, { padding: 16, color: Colors.textTertiary }]}>Searching...</Text>
              </View>
            )}

            {showSuggestions && !geoLoading && geoResults.length > 0 && (
              <View style={styles.suggestionsCard}>
                {geoResults.map((addr, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.suggestionItem,
                      i < geoResults.length - 1 && styles.suggestionBorder,
                    ]}
                    onPress={() => handleAddressSelect(addr)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.suggestionPin}>
                      <MapPin size={18} color={Colors.accent} />
                    </View>
                    <Text style={styles.suggestionLabel} numberOfLines={2}>{addr.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedAddress && (
              <View style={styles.selectedCard}>
                <View style={styles.selectedMapPreview}>
                  <MapPin size={28} color={Colors.danger} fill={`${Colors.danger}44`} />
                </View>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedLabel}>{selectedAddress.label}</Text>
                  <Text style={styles.selectedCoords}>
                    {selectedAddress.coordinate.latitude.toFixed(4)}, {selectedAddress.coordinate.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.contentBottom, { paddingBottom: insets.bottom + 16 }]}>
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
            <TouchableOpacity
              style={[styles.yellowBtn, !selectedAddress && styles.primaryBtnDisabled]}
              onPress={handleAddressConfirm}
              disabled={!selectedAddress}
              activeOpacity={1}
              testID="confirm-address-btn"
            >
              <Text style={[styles.yellowBtnText, !selectedAddress && styles.primaryBtnTextDisabled]}>CONFIRM</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const defaultAddr: SavedAddress = {
                id: 'addr-default',
                label: 'Home',
                address: 'Default Location',
                coordinate: DEFAULT_HOME_LOCATION,
                alertsEnabled: true,
              };
              addAddress(defaultAddr);
              setStep('success');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>SKIP FOR NOW</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderSuccess = () => {
    const child = authState.linkedChildren[authState.linkedChildren.length - 1];
    return (
      <Animated.View style={[styles.screenFull, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.successScreen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
          {confettiPieces.map((piece, i) => (
            <Animated.View
              key={i}
              style={[
                styles.confettiPiece,
                {
                  backgroundColor: piece.color,
                  left: piece.startX,
                  transform: [
                    { translateX: piece.x },
                    { translateY: piece.y },
                    {
                      rotate: piece.rotate.interpolate({
                        inputRange: [0, 10],
                        outputRange: ['0deg', '3600deg'],
                      }),
                    },
                  ],
                  opacity: piece.opacity,
                },
              ]}
            />
          ))}

          <View style={styles.successContent}>
            <Animated.View style={[styles.successCheckCircle, { transform: [{ scale: checkScale }] }]}>
              <CheckCircle size={64} color={Colors.success} />
            </Animated.View>

            <Text style={styles.successHeadline}>You're all set!</Text>
            <Text style={styles.successDesc}>
              Time to track {child?.name ?? 'your child'}'s bus like a pro.
            </Text>

            {child && (
              <View style={styles.childCard}>
                <View style={[styles.childAvatarCircle, { backgroundColor: child.avatarColor }]}>
                  <Text style={styles.childAvatarLetter}>{child.name[0]}</Text>
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childMeta}>{child.grade} • {child.school}</Text>
                  <View style={styles.busTag}>
                    <Bus size={12} color={Colors.primaryDark} />
                    <Text style={styles.busTagText}>{child.assignedBusId}</Text>
                  </View>
                </View>
                <Heart size={22} color={Colors.danger} fill={Colors.danger} />
              </View>
            )}
          </View>

          <View style={styles.successBottom}>
            <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
              <TouchableOpacity
                style={styles.yellowBtn}
                onPress={handleComplete}
                activeOpacity={1}
                testID="complete-onboarding-btn"
              >
                <Text style={styles.yellowBtnText}>START TRACKING</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderStep = () => {
    switch (authState.step) {
      case 'welcome':
        return renderWelcome();
      case 'privacy':
        return renderPrivacy();
      case 'enter_id':
        return renderEnterId();
      case 'enter_otp':
        return renderEnterOtp();
      case 'home_address':
        return renderHomeAddress();
      case 'success':
        return renderSuccess();
      default:
        return renderWelcome();
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderProgressBar()}
        {renderStep()}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  screenFull: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    backgroundColor: Colors.white,
  },
  progressTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: Colors.progressFill,
  },
  welcomeScreen: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: Colors.primary,
  },
  welcomeTopSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeHeadline: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.navy,
    textAlign: 'center',
    lineHeight: 36,
    marginTop: 28,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: Colors.accentDark,
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  welcomeBottomSection: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
  },
  mascotBus: {
    borderRadius: 999,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  busBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotEyeWink: {
    position: 'absolute',
    top: -8,
    right: -4,
  },
  sparklePos1: {
    position: 'absolute',
    top: 5,
    left: 10,
  },
  sparklePos2: {
    position: 'absolute',
    bottom: 15,
    right: 5,
  },
  sparklePos3: {
    position: 'absolute',
    top: 30,
    right: -10,
  },
  primaryBtn: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 5,
    borderBottomWidth: 4,
    borderBottomColor: Colors.border,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.disabledBg,
    shadowColor: '#CBCBCB',
    borderBottomColor: '#CBCBCB',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.navy,
    letterSpacing: 1,
  },
  primaryBtnTextDisabled: {
    color: Colors.disabledText,
  },
  outlineBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.navy,
    letterSpacing: 1,
  },
  contentScreen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentTop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentTopScroll: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  contentBottom: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
    paddingTop: 12,
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContentInner: {
    flexGrow: 1,
  },
  iconBubble: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
  },
  screenDesc: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 10,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  featureList: {
    width: '100%',
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.featureBg,
    padding: 16,
    borderRadius: 16,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    flex: 1,
  },
  inputSection: {
    width: '100%',
    marginTop: 8,
  },
  textInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    borderWidth: 2.5,
    borderColor: Colors.inputBorder,
    letterSpacing: 1.5,
  },
  otpInput: {
    fontSize: 32,
    letterSpacing: 10,
    fontWeight: '800' as const,
  },
  inputError: {
    borderColor: Colors.errorBorder,
    backgroundColor: Colors.errorBg,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: Colors.errorText,
    fontWeight: '700' as const,
  },
  hintText: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 10,
    paddingHorizontal: 4,
    fontWeight: '500' as const,
  },
  backBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.accent,
    letterSpacing: 0.8,
  },
  suggestionsCard: {
    width: '100%',
    backgroundColor: Colors.inputBg,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: Colors.inputBorder,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  suggestionBorder: {
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
  },
  suggestionPin: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    flex: 1,
  },
  selectedCard: {
    width: '100%',
    backgroundColor: Colors.inputBg,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  selectedMapPreview: {
    height: 110,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedInfo: {
    padding: 14,
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  selectedCoords: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  successScreen: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 3,
    top: -20,
    zIndex: 10,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCheckCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successHeadline: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.featureBg,
    padding: 16,
    borderRadius: 18,
    gap: 14,
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  childAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarLetter: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
  },
  childMeta: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  busTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  busTagText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.tagText,
  },
  successBottom: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  yellowBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 5,
    borderBottomWidth: 4,
    borderBottomColor: Colors.primaryDark,
  },
  yellowBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.navy,
    letterSpacing: 1,
  },
});
