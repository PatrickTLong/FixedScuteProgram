import React, { createContext, useContext, useRef, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PresetsScreen from '../screens/PresetsScreen';
import type { PresetsStackParamList } from './types';
import type { Preset } from '../components/PresetCard';

const Stack = createNativeStackNavigator<PresetsStackParamList>();

// Params that PresetSettingsScreen needs (moved from route params to context)
export interface PresetSettingsParams {
  name: string;
  selectedApps: string[];
  blockedWebsites: string[];
  installedApps: Array<{ id: string; name: string; icon?: string }>;
  iosSelectedAppsCount: number;
}

// Context for sharing save callback and edit state between preset screens
interface PresetSaveContextValue {
  onSave: (preset: Preset) => Promise<void>;
  setOnSave: (fn: (preset: Preset) => Promise<void>) => void;
  editingPreset: Preset | null;
  setEditingPreset: (p: Preset | null) => void;
  existingPresets: Preset[];
  setExistingPresets: (p: Preset[]) => void;
  email: string;
  setEmail: (e: string) => void;
  presetSettingsParams: PresetSettingsParams | null;
  setPresetSettingsParams: (p: PresetSettingsParams | null) => void;
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

  const [, forceUpdate] = React.useState(0);

  const setOnSave = useCallback((fn: (preset: Preset) => Promise<void>) => {
    onSaveRef.current = fn;
  }, []);

  const setEditingPreset = useCallback((p: Preset | null) => {
    editingPresetRef.current = p;
    forceUpdate(n => n + 1);
  }, []);

  const setExistingPresets = useCallback((p: Preset[]) => {
    existingPresetsRef.current = p;
  }, []);

  const setEmail = useCallback((e: string) => {
    emailRef.current = e;
  }, []);

  const setPresetSettingsParams = useCallback((p: PresetSettingsParams | null) => {
    presetSettingsParamsRef.current = p;
    forceUpdate(n => n + 1);
  }, []);

  const contextValue: PresetSaveContextValue = {
    onSave: async (preset: Preset) => onSaveRef.current(preset),
    setOnSave,
    editingPreset: editingPresetRef.current,
    setEditingPreset,
    existingPresets: existingPresetsRef.current,
    setExistingPresets,
    email: emailRef.current,
    setEmail,
    presetSettingsParams: presetSettingsParamsRef.current,
    setPresetSettingsParams,
  };

  return (
    <PresetSaveContext.Provider value={contextValue}>
      {children}
    </PresetSaveContext.Provider>
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
