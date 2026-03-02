import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingSpinner from '../components/LoadingSpinner';
import Svg, { Path } from 'react-native-svg';
import BoxiconsFilled from '../components/BoxiconsFilled';
import HeaderIconButton from '../components/HeaderIconButton';
import ConfirmationModal from '../components/ConfirmationModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  saveOverlayPreset,
  deleteOverlayPreset as deleteOverlayPresetApi,
  invalidateUserCaches,
  OverlayPreset,
} from '../services/cardApi';
import { useTheme, textSize, fontFamily, radius, shadow, iconSize, buttonPadding, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/types';
import { useOverlayEdit } from '../navigation/PresetsStack';
import { useAuth } from '../context/AuthContext';

const PlusIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"
    />
  </Svg>
);

const TrashIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"
    />
  </Svg>
);

type OverlaysNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Overlays'>;

// ============ Overlay Card Component ============
interface OverlayCardProps {
  preset: OverlayPreset;
  onPress: () => void;
  onLongPress: () => void;
}

const OverlayCard = memo(({ preset, onPress, onLongPress }: OverlayCardProps) => {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (haptics.presetCard.enabled) triggerHaptic(haptics.presetCard.type);
    Animated.timing(opacityAnim, { toValue: 0.7, duration: 30, useNativeDriver: true }).start();
  }, [opacityAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(opacityAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  }, [opacityAnim]);

  const hasCustomText = !!(preset.customBlockedText || preset.customDismissText);
  const hasCustomColors = !!(preset.customBlockedTextColor || preset.customOverlayBgColor || preset.customDismissColor);
  const hasCustomImage = !!preset.customOverlayImage;

  const details: string[] = [];
  if (hasCustomText) details.push('Custom text');
  if (hasCustomColors) details.push('Custom colors');
  if (hasCustomImage) details.push('Custom image');

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <Animated.View
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: s(buttonPadding.standard),
          paddingHorizontal: s(buttonPadding.standard),
          opacity: opacityAnim,
          ...shadow.card,
        }}
        className={`${radius['2xl']} mb-3`}
      >
        <View className="flex-row items-center">
          {/* Mini preview swatch */}
          <View style={{
            width: s(40),
            height: s(70),
            borderRadius: s(8),
            backgroundColor: preset.customOverlayBgColor || colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
            marginRight: s(14),
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
          }}>
            <MaterialCommunityIcons name="android" size={s(16)} color={preset.customBlockedTextColor || '#FFFFFF'} />
          </View>
          <View className="flex-1">
            <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.semibold}`}>
              {preset.name}
            </Text>
            {details.length > 0 && (
              <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                {details.join(', ')}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

// ============ Main Screen ============
function OverlaysScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<OverlaysNavigationProp>();
  const { userEmail, sharedOverlayPresets, setSharedOverlayPresets, refreshOverlayPresets, showModal } = useAuth();
  const { setEditingOverlayPreset, setOnOverlaySave } = useOverlayEdit();
  const userEmail_safe = userEmail || '';

  const overlayPresets = sharedOverlayPresets;
  const setOverlayPresets = setSharedOverlayPresets;

  const isReturningFromEdit = useRef(false);

  const [loading, setLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<OverlayPreset | null>(null);

  // Load overlay presets on mount
  useEffect(() => {
    if (!userEmail_safe) return;
    let spinnerTimeout: ReturnType<typeof setTimeout>;

    async function init() {
      setLoading(true);
      spinnerTimeout = setTimeout(() => setShowSpinner(true), 50);

      await refreshOverlayPresets();

      clearTimeout(spinnerTimeout);
      setShowSpinner(false);
      setLoading(false);
    }
    init();

    return () => { clearTimeout(spinnerTimeout); };
  }, [userEmail_safe]);

  // Refresh on focus (e.g., returning from editor)
  useFocusEffect(
    useCallback(() => {
      if (userEmail_safe) {
        refreshOverlayPresets();
      }
    }, [userEmail_safe])
  );

  // Save handler — called by OverlayEditorScreen via context
  const handleSaveOverlayPreset = useCallback(async (preset: OverlayPreset) => {
    // Optimistic update
    setOverlayPresets(prev => {
      const exists = prev.find(p => p.id === preset.id);
      if (exists) return prev.map(p => p.id === preset.id ? preset : p);
      return [...prev, preset];
    });

    const result = await saveOverlayPreset(userEmail_safe, preset);
    if (!result.success) {
      showModal('Error', result.error || 'Failed to save overlay preset');
      refreshOverlayPresets(true);
    }
  }, [userEmail_safe, showModal]);

  // Register save handler in context
  useEffect(() => {
    setOnOverlaySave(handleSaveOverlayPreset);
  }, [handleSaveOverlayPreset, setOnOverlaySave]);

  const handleAddPreset = useCallback(() => {
    isReturningFromEdit.current = true;
    setEditingOverlayPreset(null); // null = new preset
    navigation.navigate('OverlayEditor');
  }, [navigation, setEditingOverlayPreset]);

  const handleEditPreset = useCallback((preset: OverlayPreset) => {
    isReturningFromEdit.current = true;
    setEditingOverlayPreset(preset);
    navigation.navigate('OverlayEditor');
  }, [navigation, setEditingOverlayPreset]);

  const handleLongPressPreset = useCallback((preset: OverlayPreset) => {
    if (haptics.longPressDelete.enabled) triggerHaptic(haptics.longPressDelete.type);
    setPresetToDelete(preset);
    setDeleteModalVisible(true);
  }, []);

  const handleDeletePreset = useCallback(async () => {
    if (!presetToDelete) return;
    setDeleteModalVisible(false);

    // Optimistic delete
    const deletedPreset = presetToDelete;
    setOverlayPresets(prev => prev.filter(p => p.id !== deletedPreset.id));

    const result = await deleteOverlayPresetApi(userEmail_safe, deletedPreset.id);
    if (!result.success) {
      showModal('Error', result.error || 'Failed to delete overlay preset');
      refreshOverlayPresets(true);
    }
    setPresetToDelete(null);
  }, [presetToDelete, userEmail_safe, showModal]);

  const handleCloseDeleteModal = useCallback(() => {
    setDeleteModalVisible(false);
    setPresetToDelete(null);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshOverlayPresets(true);
    setRefreshing(false);
  }, []);

  // Stable refs for FlatList renderItem
  const handleEditPresetRef = useRef(handleEditPreset);
  const handleLongPressPresetRef = useRef(handleLongPressPreset);
  handleEditPresetRef.current = handleEditPreset;
  handleLongPressPresetRef.current = handleLongPressPreset;

  const renderItem = useCallback(({ item }: { item: OverlayPreset }) => (
    <OverlayCard
      preset={item}
      onPress={() => handleEditPresetRef.current(item)}
      onLongPress={() => handleLongPressPresetRef.current(item)}
    />
  ), []);

  const keyExtractor = useCallback((item: OverlayPreset) => item.id, []);

  const ListEmptyComponent = useCallback(() => (
    <View style={{ alignItems: 'center', paddingTop: s(60), paddingHorizontal: s(32) }}>
      <Svg width={s(48)} height={s(48)} viewBox="0 0 24 24" fill={colors.textMuted}>
        <Path fillRule="evenodd" clipRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" />
      </Svg>
      <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: s(12) }} className={`${textSize.small} ${fontFamily.regular}`}>
        No overlay presets yet
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: s(4) }}>
        <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Tap </Text>
        <BoxiconsFilled name="bx-plus-circle" size={s(14)} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular}`}> to create one</Text>
      </View>
    </View>
  ), [colors, s]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        {showSpinner && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner size={s(48)} />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center">
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>Overlays</Text>
        </View>
        <HeaderIconButton onPress={handleAddPreset}>
          <BoxiconsFilled name="bx-plus-circle" size={s(iconSize.headerNav)} color="#fff" />
        </HeaderIconButton>
      </View>

      {/* Overlay Presets List */}
      <FlatList
        className="flex-1"
        data={overlayPresets}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={{ paddingHorizontal: s(20), paddingTop: s(12), paddingBottom: s(32) }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.text]}
            progressBackgroundColor={colors.card}
            progressViewOffset={-20}
          />
        }
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Overlay Preset"
        message={`Are you sure you want to delete "${presetToDelete?.name}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        icon={<TrashIcon color={colors.red} />}
        onConfirm={handleDeletePreset}
        onCancel={handleCloseDeleteModal}
      />
    </View>
  );
}

export default memo(OverlaysScreen);
