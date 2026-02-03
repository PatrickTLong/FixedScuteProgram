import React, { createContext, useContext, useRef, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PresetsScreen from '../screens/PresetsScreen';
import EditPresetAppsScreen from '../screens/EditPresetAppsScreen';
import PresetSettingsScreen from '../screens/PresetSettingsScreen';
import type { PresetsStackParamList } from './types';
import type { Preset } from '../components/PresetCard';

const Stack = createNativeStackNavigator<PresetsStackParamList>();

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
}

const PresetSaveContext = createContext<PresetSaveContextValue | null>(null);

export function usePresetSave(): PresetSaveContextValue {
  const ctx = useContext(PresetSaveContext);
  if (!ctx) throw new Error('usePresetSave must be used within PresetsStack');
  return ctx;
}

export default function PresetsStack() {
  // Use refs for callbacks to avoid re-renders when they change
  const onSaveRef = useRef<(preset: Preset) => Promise<void>>(async () => {});
  const editingPresetRef = useRef<Preset | null>(null);
  const existingPresetsRef = useRef<Preset[]>([]);
  const emailRef = useRef<string>('');

  // Force update mechanism for when refs change
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

  const contextValue: PresetSaveContextValue = {
    onSave: async (preset: Preset) => onSaveRef.current(preset),
    setOnSave,
    editingPreset: editingPresetRef.current,
    setEditingPreset,
    existingPresets: existingPresetsRef.current,
    setExistingPresets,
    email: emailRef.current,
    setEmail,
  };

  return (
    <PresetSaveContext.Provider value={contextValue}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="PresetsMain" component={PresetsScreen} />
        <Stack.Screen name="EditPresetApps" component={EditPresetAppsScreen} />
        <Stack.Screen name="PresetSettings" component={PresetSettingsScreen} />
      </Stack.Navigator>
    </PresetSaveContext.Provider>
  );
}
