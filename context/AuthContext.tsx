import React, { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { AuthState, AuthStep, Child, RidershipEvent, ServiceAlert, SavedAddress, BoardingState } from '@/types';
import { VALID_CHILD_IDS, MOCK_CHILDREN, MOCK_RIDERSHIP_EVENTS, MOCK_SERVICE_ALERTS } from '@/mocks/children';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const STORAGE_KEY = 'busnear_auth';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    step: 'welcome',
    isAuthenticated: false,
    parentId: null,
    linkedChildren: [],
    activeChildId: null,
    savedAddresses: [],
  });
  const [pendingChildId, setPendingChildId] = useState<string>('');
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [childIdError, setChildIdError] = useState<string | null>(null);
  const [ridershipEvents, setRidershipEvents] = useState<RidershipEvent[]>(MOCK_RIDERSHIP_EVENTS);
  const [serviceAlerts, setServiceAlerts] = useState<ServiceAlert[]>(MOCK_SERVICE_ALERTS);
  const [boardingState, setBoardingState] = useState<BoardingState>('none');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const initialized = useRef(false);
  const linkedChildrenRef = useRef<Child[]>([]);

  // ─── Session restore ────────────────────────────────────────────────────────

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (isSupabaseConfigured()) {
      // Restore from Supabase session
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setIsLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            await loadUserProfile(session.user.id);
          } else if (event === 'SIGNED_OUT') {
            setAuthState({
              step: 'welcome',
              isAuthenticated: false,
              parentId: null,
              linkedChildren: [],
              activeChildId: null,
              savedAddresses: [],
            });
          }
        }
      );

      return () => subscription.unsubscribe();
    } else {
      // Demo mode: restore from AsyncStorage
      AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as AuthState;
          if (parsed.isAuthenticated) setAuthState(parsed);
        }
        setIsLoading(false);
      });
    }
  }, []);

  async function loadUserProfile(userId: string) {
    try {
      // Load linked children
      const { data: links } = await supabase
        .from('parent_children')
        .select('child_id')
        .eq('parent_id', userId);

      const childIds = links?.map((l) => l.child_id) ?? [];

      let linkedChildren: Child[] = [];
      if (childIds.length > 0) {
        const { data: childRows } = await supabase
          .from('children')
          .select('id, first_name, last_name, grade, school_id, assigned_bus_id, assigned_route_id, avatar_color, schools(name)')
          .in('id', childIds);

        linkedChildren = (childRows ?? []).map((c: any) => ({
          id: c.id,
          name: `${c.first_name}${c.last_name ? ' ' + c.last_name : ''}`,
          grade: c.grade ?? '',
          school: c.schools?.name ?? '',
          assignedBusId: c.assigned_bus_id ?? '',
          assignedRouteId: c.assigned_route_id ?? '',
          avatarColor: c.avatar_color,
        }));
      }

      // Load saved addresses
      const { data: addressRows } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('parent_id', userId)
        .order('created_at');

      const savedAddresses: SavedAddress[] = (addressRows ?? []).map((a) => ({
        id: a.id,
        label: a.label,
        address: a.address,
        coordinate: { latitude: a.latitude, longitude: a.longitude },
        alertsEnabled: a.alerts_enabled,
      }));

      // Load ridership events for linked children
      if (childIds.length > 0) {
        const { data: events } = await supabase
          .from('ridership_events')
          .select('*, children(first_name, last_name), buses(id)')
          .in('child_id', childIds)
          .order('created_at', { ascending: false })
          .limit(50);

        if (events && events.length > 0) {
          setRidershipEvents(
            events.map((e: any) => ({
              id: e.id,
              childId: e.child_id,
              childName: `${e.children?.first_name ?? ''}${e.children?.last_name ? ' ' + e.children.last_name : ''}`,
              busId: e.bus_id,
              eventType: e.event_type as 'boarded' | 'exited',
              stopName: e.stop_name ?? '',
              coordinate: { latitude: e.latitude ?? 0, longitude: e.longitude ?? 0 },
              occurredAt: new Date(e.created_at).getTime(),
            }))
          );
        }
      }

      // Load service alerts
      const busIds = [...new Set(linkedChildren.map((c) => c.assignedBusId).filter(Boolean))];
      if (busIds.length > 0) {
        const { data: alerts } = await supabase
          .from('service_alerts')
          .select('*')
          .in('bus_id', busIds)
          .order('created_at', { ascending: false })
          .limit(20);

        if (alerts && alerts.length > 0) {
          setServiceAlerts(
            alerts.map((a) => ({
              id: a.id,
              type: a.type as ServiceAlert['type'],
              severity: a.severity as ServiceAlert['severity'],
              title: a.title,
              message: a.message,
              busId: a.bus_id ?? '',
              createdAt: new Date(a.created_at).getTime(),
              read: false,
            }))
          );
        }
      }

      const isOnboarded = linkedChildren.length > 0 && savedAddresses.length > 0;

      setAuthState(prev => {
        // Preserve step if user is mid-onboarding or already past it
        const preserveStep = prev.step === 'authenticated'
          || prev.step === 'success'
          || prev.step === 'home_address';
        if (preserveStep) {
          return { ...prev, linkedChildren, savedAddresses, isAuthenticated: true, parentId: userId };
        }
        return {
          step: isOnboarded ? 'authenticated' : linkedChildren.length > 0 ? 'home_address' : 'welcome',
          isAuthenticated: true,
          parentId: userId,
          linkedChildren,
          activeChildId: linkedChildren[0]?.id ?? null,
          savedAddresses,
        };
      });
    } catch (err) {
      console.error('[Auth] Failed to load user profile:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Persist (demo mode only) ────────────────────────────────────────────────

  const saveAuthMutation = useMutation({
    mutationFn: async (state: AuthState) => {
      if (!isSupabaseConfigured()) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
      return state;
    },
  });

  // ─── Auth steps ──────────────────────────────────────────────────────────────

  const setStep = useCallback((step: AuthStep) => {
    setAuthState((prev) => ({ ...prev, step }));
    setOtpError(null);
    setChildIdError(null);
  }, []);

  /** Validate child ID against Supabase (or mock in demo mode) */
  const validateChildId = useCallback(async (code: string): Promise<boolean> => {
    const normalized = code.trim().toUpperCase();

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('children')
        .select('id')
        .eq('id', normalized)
        .single();

      if (error || !data) {
        setChildIdError('Invalid Private Child ID. Please check and try again.');
        return false;
      }
      setPendingChildId(normalized);
      setChildIdError(null);
      return true;
    }

    // Demo mode fallback
    const childId = VALID_CHILD_IDS[normalized];
    if (!childId) {
      setChildIdError('Invalid Private Child ID. Please check and try again.');
      return false;
    }
    setPendingChildId(childId);
    setChildIdError(null);
    return true;
  }, []);

  /** Send OTP to parent's email or phone via Supabase Auth */
  const requestOtp = useCallback(async (contact: string, channel: 'email' | 'sms') => {
    if (!isSupabaseConfigured()) {
      // Demo mode: skip OTP, go directly to OTP entry screen
      setPendingEmail(contact);
      setAuthState((prev) => ({ ...prev, step: 'enter_otp' }));
      return;
    }

    try {
      if (channel === 'email') {
        const { error } = await supabase.auth.signInWithOtp({ email: contact });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: contact,
          options: { channel: 'sms' },
        });
        if (error) throw error;
      }
      setPendingEmail(contact);
      setAuthState((prev) => ({ ...prev, step: 'enter_otp' }));
    } catch (err: any) {
      setOtpError(err.message ?? 'Failed to send code. Please try again.');
    }
  }, []);

  /** Verify OTP code against Supabase Auth (or hardcoded demo code) */
  const verifyOtp = useCallback(async (code: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      // Demo mode
      if (code !== '123456') {
        setOtpError('Invalid code. Try 123456 for demo.');
        return false;
      }

      const child = MOCK_CHILDREN.find((c) => c.id === pendingChildId);
      if (!child) {
        setOtpError('Child not found.');
        return false;
      }

      const alreadyLinked = authState.linkedChildren.some((c) => c.id === child.id);
      const updatedChildren = alreadyLinked
        ? authState.linkedChildren
        : [...authState.linkedChildren, child];

      const newState: AuthState = {
        ...authState,
        step: 'home_address',
        isAuthenticated: true,
        parentId: 'parent-' + Date.now(),
        linkedChildren: updatedChildren,
        activeChildId: child.id,
      };
      setAuthState(newState);
      setOtpError(null);
      return true;
    }

    // Real Supabase OTP verification
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: code,
        type: 'magiclink',
      });

      if (error) {
        setOtpError('Invalid code. Please try again.');
        return false;
      }

      if (!data.user) {
        setOtpError('Verification failed. Please try again.');
        return false;
      }

      // Link child to parent in DB
      if (pendingChildId) {
        await supabase.from('parent_children').upsert({
          parent_id: data.user.id,
          child_id: pendingChildId,
        });
      }

      setOtpError(null);
      // loadUserProfile will be triggered by onAuthStateChange, but we advance step now
      setAuthState((prev) => ({ ...prev, step: 'home_address' }));
      return true;
    } catch (err: any) {
      setOtpError(err.message ?? 'Verification failed.');
      return false;
    }
  }, [pendingChildId, pendingEmail, authState]);

  const completeOnboarding = useCallback(() => {
    setAuthState((prev) => {
      const newState: AuthState = { ...prev, step: 'authenticated' };
      saveAuthMutation.mutate(newState);
      return newState;
    });
  }, [saveAuthMutation]);

  const setActiveChild = useCallback((childId: string) => {
    setAuthState((prev) => {
      const newState = { ...prev, activeChildId: childId };
      saveAuthMutation.mutate(newState);
      return newState;
    });
  }, [saveAuthMutation]);

  const addChildLink = useCallback(async (code: string): Promise<boolean> => {
    const normalized = code.trim().toUpperCase();

    // Capture current state for async reads (parentId, linkedChildren)
    let currentState: AuthState | null = null;
    setAuthState((prev) => { currentState = prev; return prev; });
    // Wait one tick for the capture
    await Promise.resolve();

    if (isSupabaseConfigured() && currentState && (currentState as AuthState).parentId) {
      const state = currentState as AuthState;
      const { data, error } = await supabase
        .from('children')
        .select('id, first_name, last_name, grade, assigned_bus_id, assigned_route_id, avatar_color, schools(name)')
        .eq('id', normalized)
        .single();

      if (error || !data) return false;

      const alreadyLinked = state.linkedChildren.some((c) => c.id === normalized);
      if (alreadyLinked) return false;

      await supabase.from('parent_children').upsert({
        parent_id: state.parentId,
        child_id: normalized,
      });

      const child: Child = {
        id: (data as any).id,
        name: `${(data as any).first_name}${(data as any).last_name ? ' ' + (data as any).last_name : ''}`,
        grade: (data as any).grade ?? '',
        school: (data as any).schools?.name ?? '',
        assignedBusId: (data as any).assigned_bus_id ?? '',
        assignedRouteId: (data as any).assigned_route_id ?? '',
        avatarColor: (data as any).avatar_color,
      };

      setAuthState((prev) => ({ ...prev, linkedChildren: [...prev.linkedChildren, child] }));
      return true;
    }

    // Demo mode
    const childId = VALID_CHILD_IDS[normalized];
    if (!childId) return false;
    const child = MOCK_CHILDREN.find((c) => c.id === childId);
    if (!child) return false;

    let alreadyLinked = false;
    setAuthState((prev) => {
      alreadyLinked = prev.linkedChildren.some((c) => c.id === child.id);
      if (alreadyLinked) return prev;
      const newState = { ...prev, linkedChildren: [...prev.linkedChildren, child] };
      saveAuthMutation.mutate(newState);
      return newState;
    });
    return !alreadyLinked;
  }, [saveAuthMutation]);

  const addAddress = useCallback(async (address: SavedAddress) => {
    if (isSupabaseConfigured()) {
      // Read parentId from current state without stale closure
      let parentId: string | null = null;
      setAuthState((prev) => { parentId = prev.parentId; return prev; });
      await Promise.resolve();

      if (parentId) {
        const { data } = await supabase
          .from('saved_addresses')
          .insert({
            parent_id: parentId,
            label: address.label,
            address: address.address,
            latitude: address.coordinate.latitude,
            longitude: address.coordinate.longitude,
            alerts_enabled: address.alertsEnabled,
          })
          .select('id')
          .single();

        const withId = { ...address, id: data?.id ?? address.id };
        setAuthState((prev) => ({ ...prev, savedAddresses: [...prev.savedAddresses, withId] }));
        return;
      }
    }

    setAuthState((prev) => {
      const newState = { ...prev, savedAddresses: [...prev.savedAddresses, address] };
      saveAuthMutation.mutate(newState);
      return newState;
    });
  }, [saveAuthMutation]);

  const updateAddress = useCallback(async (address: SavedAddress) => {
    if (isSupabaseConfigured()) {
      await supabase
        .from('saved_addresses')
        .update({
          label: address.label,
          address: address.address,
          latitude: address.coordinate.latitude,
          longitude: address.coordinate.longitude,
          alerts_enabled: address.alertsEnabled,
        })
        .eq('id', address.id);
    }

    setAuthState((prev) => {
      const newState = { ...prev, savedAddresses: prev.savedAddresses.map((a) => a.id === address.id ? address : a) };
      saveAuthMutation.mutate(newState);
      return newState;
    });
  }, [saveAuthMutation]);

  const removeAddress = useCallback(async (addressId: string) => {
    if (isSupabaseConfigured()) {
      await supabase.from('saved_addresses').delete().eq('id', addressId);
    }

    setAuthState((prev) => {
      const newState = { ...prev, savedAddresses: prev.savedAddresses.filter((a) => a.id !== addressId) };
      saveAuthMutation.mutate(newState);
      return newState;
    });
  }, [saveAuthMutation]);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
    setAuthState({
      step: 'welcome',
      isAuthenticated: false,
      parentId: null,
      linkedChildren: [],
      activeChildId: null,
      savedAddresses: [],
    });
  }, []);

  // ─── Ridership & alerts ──────────────────────────────────────────────────────

  const addRidershipEvent = useCallback((event: RidershipEvent) => {
    setRidershipEvents((prev) => [event, ...prev]);
    if (event.eventType === 'boarded') {
      setBoardingState('boarded');
    } else if (event.eventType === 'exited') {
      setBoardingState('exited');
    }
  }, []);

  const markAlertRead = useCallback((alertId: string) => {
    setServiceAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
    );
  }, []);

  // Keep ref in sync so Realtime callbacks always have current children
  useEffect(() => {
    linkedChildrenRef.current = authState.linkedChildren;
  }, [authState.linkedChildren]);

  // Subscribe to realtime ridership events for linked children
  useEffect(() => {
    if (!isSupabaseConfigured() || !authState.parentId || authState.linkedChildren.length === 0) return;

    const childIds = authState.linkedChildren.map((c) => c.id);
    const channel = supabase
      .channel('ridership-events-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ridership_events',
          filter: `child_id=in.(${childIds.join(',')})`,
        },
        async (payload) => {
          const e = payload.new as any;
          // Use ref to get current children (avoids stale closure)
          const child = linkedChildrenRef.current.find((c) => c.id === e.child_id);
          const event: RidershipEvent = {
            id: e.id,
            childId: e.child_id,
            childName: child?.name ?? e.child_id,
            busId: e.bus_id,
            eventType: e.event_type,
            stopName: e.stop_name ?? '',
            coordinate: { latitude: e.latitude ?? 0, longitude: e.longitude ?? 0 },
            occurredAt: new Date(e.created_at).getTime(),
          };
          addRidershipEvent(event);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.parentId, authState.linkedChildren.length]);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const activeChild =
    authState.linkedChildren.find((c) => c.id === authState.activeChildId) ??
    authState.linkedChildren[0] ??
    null;

  const childEvents = ridershipEvents.filter(
    (e) => !activeChild || e.childId === activeChild.id
  );

  const lastEvent = childEvents.length > 0 ? childEvents[0] : null;

  return {
    authState,
    activeChild,
    otpError,
    childIdError,
    setStep,
    validateChildId,
    requestOtp,
    verifyOtp,
    completeOnboarding,
    setActiveChild,
    addChildLink,
    addAddress,
    updateAddress,
    removeAddress,
    logout,
    ridershipEvents: childEvents,
    serviceAlerts,
    addRidershipEvent,
    markAlertRead,
    boardingState,
    lastEvent,
    isLoading,
  };
});
