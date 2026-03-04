import React, { createContext, useContext, useRef, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PresetsScreen from '../screens/PresetsScreen';
import type { PresetsStackParamList } from './types';
import type { Preset } from '../components/PresetCard';
import type { OverlayPreset } from '../services/cardApi';

const Stack = createNativeStackNavigator<PresetsStackParamList>();

// Params that PresetSettingsScreen needs (moved from route params to context)
export interface PresetSettingsParams {
  name: string;
  selectedApps: string[];
  blockedWebsites: string[];
  installedApps: Array<{ id: string; name: string; icon?: string }>;
  iosSelectedAppsCount: number;
}

// Persisted form state for PresetSettingsScreen (survives back-and-forward navigation)
export interface FinalSettingsState {
  blockSettings: boolean;
  noTimeLimit: boolean;
  timerDays: number;
  timerHours: number;
  timerMinutes: number;
  timerSeconds: number;
  timerEnabled: boolean;
  targetDate: string | null;
  dateEnabled: boolean;
  allowEmergencyTapout: boolean;
  strictMode: boolean;
  isScheduled: boolean;
  scheduleStartDate: string | null;
  scheduleEndDate: string | null;
  isRecurring: boolean;
  recurringValue: string;
  recurringUnit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  customBlockedText: string;
  customDismissText: string;
  customBlockedTextColor: string;
  customOverlayBgColor: string;
  customDismissColor: string;
  customOverlayImage: string;
  customOverlayImageSize: number;
  iconPosX: number;
  iconPosY: number;
  blockedTextPosX: number;
  blockedTextPosY: number;
  dismissTextPosX: number;
  dismissTextPosY: number;
  iconVisible: boolean;
  blockedTextVisible: boolean;
  dismissTextVisible: boolean;
  blockedTextSize: number;
  dismissTextSize: number;
  overlayPresetId: string;
}

// Params passed to the DatePicker screen
export interface DatePickerParams {
  target: 'targetDate' | 'scheduleStart' | 'scheduleEnd';
  existingDate: string | null;
  minimumDate: string | null;
}

// Result returned from the DatePicker screen
export interface DatePickerResult {
  target: 'targetDate' | 'scheduleStart' | 'scheduleEnd';
  selectedDate: string;
}

// Context for sharing save callback and edit state between preset screens
interface PresetSaveContextValue {
  onSave: (preset: Preset) => Promise<void>;
  setOnSave: (fn: (preset: Preset) => Promise<void>) => void;
  getEditingPreset: () => Preset | null;
  setEditingPreset: (p: Preset | null) => void;
  getExistingPresets: () => Preset[];
  setExistingPresets: (p: Preset[]) => void;
  getEmail: () => string;
  setEmail: (e: string) => void;
  getPresetSettingsParams: () => PresetSettingsParams | null;
  setPresetSettingsParams: (p: PresetSettingsParams | null) => void;
  getFinalSettingsState: () => FinalSettingsState | null;
  setFinalSettingsState: (s: FinalSettingsState | null) => void;
  getDatePickerParams: () => DatePickerParams | null;
  setDatePickerParams: (p: DatePickerParams | null) => void;
  getDatePickerResult: () => DatePickerResult | null;
  setDatePickerResult: (r: DatePickerResult | null) => void;
}

const PresetSaveContext = createContext<PresetSaveContextValue | null>(null);

export function usePresetSave(): PresetSaveContextValue {
  const ctx = useContext(PresetSaveContext);
  if (!ctx) throw new Error('usePresetSave must be used within PresetSaveProvider');
  return ctx;
}

// Provider extracted so it can wrap the MainStack (above tab navigator)
export function PresetSaveProvider({ children }: { children: React.ReactNode }) {
  const onSaveRef = useRef<(preset: Preset) => Promise<void>>(async () => {});
  const editingPresetRef = useRef<Preset | null>(null);
  const existingPresetsRef = useRef<Preset[]>([]);
  const emailRef = useRef<string>('');
  const presetSettingsParamsRef = useRef<PresetSettingsParams | null>(null);
  const finalSettingsStateRef = useRef<FinalSettingsState | null>(null);
  const datePickerParamsRef = useRef<DatePickerParams | null>(null);
  const datePickerResultRef = useRef<DatePickerResult | null>(null);

  const setOnSave = useCallback((fn: (preset: Preset) => Promise<void>) => {
    onSaveRef.current = fn;
  }, []);

  const setEditingPreset = useCallback((p: Preset | null) => {
    editingPresetRef.current = p;
  }, []);

  const setExistingPresets = useCallback((p: Preset[]) => {
    existingPresetsRef.current = p;
  }, []);

  const setEmail = useCallback((e: string) => {
    emailRef.current = e;
  }, []);

  const setPresetSettingsParams = useCallback((p: PresetSettingsParams | null) => {
    presetSettingsParamsRef.current = p;
  }, []);

  const setFinalSettingsState = useCallback((s: FinalSettingsState | null) => {
    finalSettingsStateRef.current = s;
  }, []);

  const setDatePickerParams = useCallback((p: DatePickerParams | null) => {
    datePickerParamsRef.current = p;
  }, []);

  const setDatePickerResult = useCallback((r: DatePickerResult | null) => {
    datePickerResultRef.current = r;
  }, []);

  const getEditingPreset = useCallback(() => editingPresetRef.current, []);
  const getExistingPresets = useCallback(() => existingPresetsRef.current, []);
  const getEmail = useCallback(() => emailRef.current, []);
  const getPresetSettingsParams = useCallback(() => presetSettingsParamsRef.current, []);
  const getFinalSettingsState = useCallback(() => finalSettingsStateRef.current, []);
  const getDatePickerParams = useCallback(() => datePickerParamsRef.current, []);
  const getDatePickerResult = useCallback(() => datePickerResultRef.current, []);

  const contextValue = React.useMemo<PresetSaveContextValue>(() => ({
    onSave: async (preset: Preset) => onSaveRef.current(preset),
    setOnSave,
    getEditingPreset,
    setEditingPreset,
    getExistingPresets,
    setExistingPresets,
    getEmail,
    setEmail,
    getPresetSettingsParams,
    setPresetSettingsParams,
    getFinalSettingsState,
    setFinalSettingsState,
    getDatePickerParams,
    setDatePickerParams,
    getDatePickerResult,
    setDatePickerResult,
  }), [setOnSave, getEditingPreset, setEditingPreset, getExistingPresets, setExistingPresets, getEmail, setEmail, getPresetSettingsParams, setPresetSettingsParams, getFinalSettingsState, setFinalSettingsState, getDatePickerParams, setDatePickerParams, getDatePickerResult, setDatePickerResult]);

  return (
    <PresetSaveContext.Provider value={contextValue}>
      {children}
    </PresetSaveContext.Provider>
  );
}

// ============ Overlay Edit Context ============
// Simple ref-based context for passing overlay preset data to/from OverlayEditorScreen

interface OverlayEditContextValue {
  getEditingOverlayPreset: () => OverlayPreset | null;
  setEditingOverlayPreset: (p: OverlayPreset | null) => void;
  getOnOverlaySave: () => ((preset: OverlayPreset) => Promise<void>);
  setOnOverlaySave: (fn: (preset: OverlayPreset) => Promise<void>) => void;
}

const OverlayEditContext = createContext<OverlayEditContextValue | null>(null);

export function useOverlayEdit(): OverlayEditContextValue {
  const ctx = useContext(OverlayEditContext);
  if (!ctx) throw new Error('useOverlayEdit must be used within OverlayEditProvider');
  return ctx;
}

export function OverlayEditProvider({ children }: { children: React.ReactNode }) {
  const editingOverlayPresetRef = useRef<OverlayPreset | null>(null);
  const onOverlaySaveRef = useRef<(preset: OverlayPreset) => Promise<void>>(async () => {});

  const getEditingOverlayPreset = useCallback(() => editingOverlayPresetRef.current, []);
  const setEditingOverlayPreset = useCallback((p: OverlayPreset | null) => {
    console.log(`[OVERLAY] OverlayEditContext — setEditingOverlayPreset: ${p ? `"${p.name}" (id: ${p.id})` : 'null (new preset)'}`);
    editingOverlayPresetRef.current = p;
  }, []);
  const getOnOverlaySave = useCallback(() => onOverlaySaveRef.current, []);
  const setOnOverlaySave = useCallback((fn: (preset: OverlayPreset) => Promise<void>) => {
    console.log('[OVERLAY] OverlayEditContext — setOnOverlaySave registered');
    onOverlaySaveRef.current = fn;
  }, []);

  const contextValue = React.useMemo<OverlayEditContextValue>(() => ({
    getEditingOverlayPreset,
    setEditingOverlayPreset,
    getOnOverlaySave,
    setOnOverlaySave,
  }), [getEditingOverlayPreset, setEditingOverlayPreset, getOnOverlaySave, setOnOverlaySave]);

  return (
    <OverlayEditContext.Provider value={contextValue}>
      {children}
    </OverlayEditContext.Provider>
  );
}

export default function PresetsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="PresetsMain" component={PresetsScreen} />
    </Stack.Navigator>
  );
}
