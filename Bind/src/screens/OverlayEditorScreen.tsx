import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Image,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { PinchGestureHandler, State as GHState } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { getAuthToken } from '../services/cardApi';
import { API_URL } from '../config/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InfoModal from '../components/InfoModal';
import HeaderIconButton from '../components/HeaderIconButton';
import BoxiconsFilled from '../components/BoxiconsFilled';
import { useTheme, textSize, fontFamily, radius, shadow, iconSize, buttonPadding, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import { useOverlayEdit } from '../navigation/PresetsStack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/types';
import type { OverlayPreset } from '../services/cardApi';

// ============ Icon Components ============
const BackArrowIcon = ({ size = iconSize.lg, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-reply-big" size={size} color={color} />
);

const FileIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-save" size={size} color={color} />
);

type OverlayEditorNavigationProp = BottomTabNavigationProp<MainTabParamList, 'OverlayEditor'>;

// ============ Preview Element Type ============
type PreviewElement = 'icon' | 'blockedText' | 'dismissText' | 'background';

// ============ Spectrum Colors ============
const SPECTRUM_COLORS = ['#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#8000FF', '#FF00FF', '#FF0000'];

// ============ Grid / Gesture Constants ============
const GRID_SNAP = 10;
const LONG_PRESS_MS = 500;
const DOUBLE_TAP_MS = 300;
const DRAG_THRESHOLD = 4;

// ============ Main Screen Component ============
function OverlayEditorScreen() {
  const navigation = useNavigation<OverlayEditorNavigationProp>();
  const { getEditingOverlayPreset, getOnOverlaySave } = useOverlayEdit();
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();

  // Overlay preset name
  const [name, setName] = useState('');

  // Custom text
  const [customBlockedText, setCustomBlockedText] = useState('');
  const [customDismissText, setCustomDismissText] = useState('');

  // Custom text color
  const [customBlockedTextColor, setCustomBlockedTextColor] = useState('');

  // Custom overlay background color
  const [customOverlayBgColor, setCustomOverlayBgColor] = useState('');

  // Custom dismiss text color
  const [customDismissColor, setCustomDismissColor] = useState('');

  // Custom overlay image
  const [customOverlayImage, setCustomOverlayImage] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [customOverlayImageSize, setCustomOverlayImageSize] = useState(120);

  // Image upload error modal
  const [imageErrorModalVisible, setImageErrorModalVisible] = useState(false);
  const [imageErrorMessage, setImageErrorMessage] = useState('');

  // Overlay element positions (percentage 0-100, 50=center)
  const [iconPosX, setIconPosX] = useState(50);
  const [iconPosY, setIconPosY] = useState(30);
  const [blockedTextPosX, setBlockedTextPosX] = useState(50);
  const [blockedTextPosY, setBlockedTextPosY] = useState(50);
  const [dismissTextPosX, setDismissTextPosX] = useState(50);
  const [dismissTextPosY, setDismissTextPosY] = useState(70);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [previewHeight, setPreviewHeight] = useState(0);

  // Animated values for draggable preview elements
  const iconPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const blockedTextPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dismissTextPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isDragging = useRef(false);

  // Interactive preview editor state
  const [selectedElement, setSelectedElement] = useState<PreviewElement | null>(null);
  const [editingText, setEditingText] = useState<'blockedText' | 'dismissText' | null>(null);
  const [iconVisible, setIconVisible] = useState(true);
  const [blockedTextVisible, setBlockedTextVisible] = useState(true);
  const [dismissTextVisible, setDismissTextVisible] = useState(true);
  const [blockedTextSize, setBlockedTextSize] = useState(11);
  const [dismissTextSize, setDismissTextSize] = useState(7);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuTarget, setContextMenuTarget] = useState<PreviewElement | null>(null);
  const [colorPickerTarget, setColorPickerTarget] = useState<PreviewElement | null>(null);
  const [colorPickerActiveWidth, setColorPickerActiveWidth] = useState(0);
  const editInputRef = useRef<TextInput>(null);
  const lastTapTimeRef = useRef<Record<string, number>>({});

  // Refs for current values (used in save and gesture callbacks)
  const mainScrollRef = useRef<ScrollView>(null);
  const hasSaved = useRef(false);
  const editingPresetIdRef = useRef<string | null>(null);

  const iconPosXRef = useRef(iconPosX);
  const iconPosYRef = useRef(iconPosY);
  const blockedTextPosXRef = useRef(blockedTextPosX);
  const blockedTextPosYRef = useRef(blockedTextPosY);
  const dismissTextPosXRef = useRef(dismissTextPosX);
  const dismissTextPosYRef = useRef(dismissTextPosY);
  const iconVisibleRef = useRef(iconVisible);
  const blockedTextVisibleRef = useRef(blockedTextVisible);
  const dismissTextVisibleRef = useRef(dismissTextVisible);

  // Keep refs in sync
  iconPosXRef.current = iconPosX;
  iconPosYRef.current = iconPosY;
  blockedTextPosXRef.current = blockedTextPosX;
  blockedTextPosYRef.current = blockedTextPosY;
  dismissTextPosXRef.current = dismissTextPosX;
  dismissTextPosYRef.current = dismissTextPosY;
  iconVisibleRef.current = iconVisible;
  blockedTextVisibleRef.current = blockedTextVisible;
  dismissTextVisibleRef.current = dismissTextVisible;

  // Hold-to-repeat for image size +/- buttons
  const imageSizeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============ Initialize from editing preset on focus ============
  useFocusEffect(
    useCallback(() => {
      hasSaved.current = false;
      const preset = getEditingOverlayPreset();
      editingPresetIdRef.current = preset?.id || null;

      if (preset) {
        setName(preset.name || '');
        setCustomBlockedText(preset.customBlockedText ?? '');
        setCustomDismissText(preset.customDismissText ?? '');
        setCustomBlockedTextColor(preset.customBlockedTextColor ?? '');
        setCustomOverlayBgColor(preset.customOverlayBgColor ?? '');
        setCustomDismissColor(preset.customDismissColor ?? '');
        setCustomOverlayImage(preset.customOverlayImage ?? '');
        setCustomOverlayImageSize(preset.customOverlayImageSize ?? 120);
        setIconPosX(preset.iconPosX ?? 50);
        setIconPosY(preset.iconPosY ?? 30);
        setBlockedTextPosX(preset.blockedTextPosX ?? 50);
        setBlockedTextPosY(preset.blockedTextPosY ?? 50);
        setDismissTextPosX(preset.dismissTextPosX ?? 50);
        setDismissTextPosY(preset.dismissTextPosY ?? 70);
        setIconVisible(preset.iconVisible ?? true);
        setBlockedTextVisible(preset.blockedTextVisible ?? true);
        setDismissTextVisible(preset.dismissTextVisible ?? true);
        setBlockedTextSize(preset.blockedTextSize ?? 11);
        setDismissTextSize(preset.dismissTextSize ?? 7);
      } else {
        // New overlay preset defaults
        setName('');
        setCustomBlockedText('');
        setCustomDismissText('');
        setCustomBlockedTextColor('');
        setCustomOverlayBgColor('');
        setCustomDismissColor('');
        setCustomOverlayImage('');
        setCustomOverlayImageSize(120);
        setIconPosX(50);
        setIconPosY(30);
        setBlockedTextPosX(50);
        setBlockedTextPosY(50);
        setDismissTextPosX(50);
        setDismissTextPosY(70);
        setIconVisible(true);
        setBlockedTextVisible(true);
        setDismissTextVisible(true);
        setBlockedTextSize(11);
        setDismissTextSize(7);
      }

      // Reset UI state
      setSelectedElement(null);
      setEditingText(null);
      setContextMenuVisible(false);
      setColorPickerTarget(null);
    }, [getEditingOverlayPreset])
  );

  // ============ Color Picker Helper ============
  const getColorFromPosition = useCallback((x: number, width: number): string => {
    if (width <= 0) return '#FFFFFF';
    const ratio = Math.max(0, Math.min(1, x / width));
    const segment = ratio * (SPECTRUM_COLORS.length - 1);
    const index = Math.floor(segment);
    const t = segment - index;
    const c1 = SPECTRUM_COLORS[Math.min(index, SPECTRUM_COLORS.length - 1)];
    const c2 = SPECTRUM_COLORS[Math.min(index + 1, SPECTRUM_COLORS.length - 1)];
    const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  }, []);

  // Hold-to-repeat for image size +/- buttons
  const startImageSizeHold = useCallback((delta: number) => {
    setCustomOverlayImageSize(prev => Math.max(40, Math.min(250, prev + delta)));
    const timeout = setTimeout(() => {
      imageSizeIntervalRef.current = setInterval(() => {
        setCustomOverlayImageSize(prev => Math.max(40, Math.min(250, prev + delta)));
      }, 80);
    }, 300);
    imageSizeIntervalRef.current = timeout as unknown as ReturnType<typeof setInterval>;
  }, []);

  const stopImageSizeHold = useCallback(() => {
    if (imageSizeIntervalRef.current !== null) {
      clearInterval(imageSizeIntervalRef.current);
      clearTimeout(imageSizeIntervalRef.current as unknown as ReturnType<typeof setTimeout>);
      imageSizeIntervalRef.current = null;
    }
  }, []);

  // Throttled color picker PanResponder factory
  const colorRafRef = useRef<{ [key: string]: number | null }>({});
  const pendingColorRef = useRef<{ [key: string]: string }>({});

  const makeColorPickerPanResponder = useCallback((
    pickerWidth: number,
    setColor: (c: string) => void,
    key: string,
  ) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const x = Math.max(0, Math.min(evt.nativeEvent.locationX, pickerWidth));
      setColor(getColorFromPosition(x, pickerWidth));
    },
    onPanResponderMove: (evt) => {
      const x = Math.max(0, Math.min(evt.nativeEvent.locationX, pickerWidth));
      pendingColorRef.current[key] = getColorFromPosition(x, pickerWidth);
      if (!colorRafRef.current[key]) {
        colorRafRef.current[key] = requestAnimationFrame(() => {
          if (pendingColorRef.current[key]) {
            setColor(pendingColorRef.current[key]);
            delete pendingColorRef.current[key];
          }
          colorRafRef.current[key] = null;
        });
      }
    },
    onPanResponderRelease: () => {
      if (pendingColorRef.current[key]) {
        setColor(pendingColorRef.current[key]);
        delete pendingColorRef.current[key];
      }
      if (colorRafRef.current[key]) {
        cancelAnimationFrame(colorRafRef.current[key]!);
        colorRafRef.current[key] = null;
      }
    },
  }), [getColorFromPosition]);

  // ============ Draggable Preview Elements ============
  const findFreePosition = useCallback((desiredX: number, desiredY: number, excludeKey: PreviewElement) => {
    const others = [
      { key: 'icon', x: iconPosXRef.current, y: iconPosYRef.current, visible: iconVisibleRef.current },
      { key: 'blockedText', x: blockedTextPosXRef.current, y: blockedTextPosYRef.current, visible: blockedTextVisibleRef.current },
      { key: 'dismissText', x: dismissTextPosXRef.current, y: dismissTextPosYRef.current, visible: dismissTextVisibleRef.current },
    ].filter(e => e.key !== excludeKey && e.visible);

    const isOccupied = (x: number, y: number) => others.some(e => e.x === x && e.y === y);

    if (!isOccupied(desiredX, desiredY)) return { x: desiredX, y: desiredY };

    let best = { x: desiredX, y: desiredY, dist: Infinity };
    for (let gx = 0; gx <= 100; gx += GRID_SNAP) {
      for (let gy = 0; gy <= 100; gy += GRID_SNAP) {
        if (isOccupied(gx, gy)) continue;
        const dist = Math.abs(gx - desiredX) + Math.abs(gy - desiredY);
        if (dist < best.dist) best = { x: gx, y: gy, dist };
      }
    }
    return { x: best.x, y: best.y };
  }, []);

  const makeDraggablePanResponder = useCallback((
    pan: Animated.ValueXY,
    setPosX: (x: number) => void,
    setPosY: (y: number) => void,
    currentPosXRef: React.MutableRefObject<number>,
    currentPosYRef: React.MutableRefObject<number>,
    elementKey: PreviewElement,
  ) => {
    let startOffset = { x: 0, y: 0 };
    let hasDragged = false;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let longPressFired = false;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > DRAG_THRESHOLD || Math.abs(gs.dy) > DRAG_THRESHOLD,
      onPanResponderGrant: () => {
        hasDragged = false;
        longPressFired = false;
        mainScrollRef.current?.setNativeProps({ scrollEnabled: false });
        longPressTimer = setTimeout(() => {
          longPressFired = true;
          if (!hasDragged) {
            setSelectedElement(elementKey);
            setContextMenuTarget(elementKey);
            setContextMenuVisible(true);
            triggerHaptic('impactMedium');
          }
        }, LONG_PRESS_MS);
        if (previewWidth > 0 && previewHeight > 0) {
          startOffset = {
            x: ((currentPosXRef.current - 50) / 100) * previewWidth,
            y: ((currentPosYRef.current - 50) / 100) * previewHeight,
          };
        }
        pan.setOffset(startOffset);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gs) => {
        if (Math.abs(gs.dx) > DRAG_THRESHOLD || Math.abs(gs.dy) > DRAG_THRESHOLD) {
          if (!hasDragged) {
            hasDragged = true;
            isDragging.current = true;
            setSelectedElement(elementKey);
            setEditingText(null);
            setContextMenuVisible(false);
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
          }
          // @ts-ignore - Animated.event returns a function
          Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(evt, gs);
        }
      },
      onPanResponderRelease: (_, gs) => {
        mainScrollRef.current?.setNativeProps({ scrollEnabled: true });
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }

        if (hasDragged) {
          pan.flattenOffset();
          if (previewWidth > 0 && previewHeight > 0) {
            const rawPctX = 50 + ((startOffset.x + gs.dx) / previewWidth) * 100;
            const rawPctY = 50 + ((startOffset.y + gs.dy) / previewHeight) * 100;
            const rawSnappedX = Math.max(0, Math.min(100, Math.round(rawPctX / GRID_SNAP) * GRID_SNAP));
            const rawSnappedY = Math.max(0, Math.min(100, Math.round(rawPctY / GRID_SNAP) * GRID_SNAP));
            const free = findFreePosition(rawSnappedX, rawSnappedY, elementKey);
            const snappedX = free.x;
            const snappedY = free.y;
            setPosX(snappedX);
            setPosY(snappedY);
            const snapPixelX = ((snappedX - 50) / 100) * previewWidth;
            const snapPixelY = ((snappedY - 50) / 100) * previewHeight;
            Animated.spring(pan, {
              toValue: { x: snapPixelX, y: snapPixelY },
              useNativeDriver: false,
              friction: 7,
            }).start(() => { isDragging.current = false; });
          } else {
            isDragging.current = false;
          }
        } else if (!longPressFired) {
          pan.flattenOffset();
          const now = Date.now();
          const lastTap = lastTapTimeRef.current[elementKey] || 0;
          if (now - lastTap < DOUBLE_TAP_MS && (elementKey === 'blockedText' || elementKey === 'dismissText')) {
            setSelectedElement(elementKey);
            setEditingText(elementKey);
            lastTapTimeRef.current[elementKey] = 0;
          } else {
            setSelectedElement(prev => prev === elementKey ? null : elementKey);
            setEditingText(null);
            setContextMenuVisible(false);
            lastTapTimeRef.current[elementKey] = now;
          }
        } else {
          pan.flattenOffset();
        }
      },
      onPanResponderTerminate: () => {
        mainScrollRef.current?.setNativeProps({ scrollEnabled: true });
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        pan.flattenOffset();
        isDragging.current = false;
      },
    });
  }, [previewWidth, previewHeight, findFreePosition]);

  const iconPanResponder = useMemo(
    () => makeDraggablePanResponder(iconPan, setIconPosX, setIconPosY, iconPosXRef, iconPosYRef, 'icon'),
    [makeDraggablePanResponder]
  );

  const blockedTextPanResponder = useMemo(
    () => makeDraggablePanResponder(blockedTextPan, setBlockedTextPosX, setBlockedTextPosY, blockedTextPosXRef, blockedTextPosYRef, 'blockedText'),
    [makeDraggablePanResponder]
  );

  const dismissTextPanResponder = useMemo(
    () => makeDraggablePanResponder(dismissTextPan, setDismissTextPosX, setDismissTextPosY, dismissTextPosXRef, dismissTextPosYRef, 'dismissText'),
    [makeDraggablePanResponder]
  );

  // Handle color change from inline picker
  const handleColorPickerChange = useCallback((color: string) => {
    if (!colorPickerTarget) return;
    if (colorPickerTarget === 'background') {
      setCustomOverlayBgColor(color);
    } else if (colorPickerTarget === 'blockedText') {
      setCustomBlockedTextColor(color);
    } else if (colorPickerTarget === 'dismissText') {
      setCustomDismissColor(color);
    }
  }, [colorPickerTarget]);

  // Active color picker PanResponder
  const activeColorPanResponder = useMemo(
    () => makeColorPickerPanResponder(colorPickerActiveWidth, handleColorPickerChange, 'active'),
    [colorPickerActiveWidth, makeColorPickerPanResponder, handleColorPickerChange]
  );

  // Get current color for the active picker target
  const getActiveColor = useCallback(() => {
    if (colorPickerTarget === 'background') return customOverlayBgColor;
    if (colorPickerTarget === 'blockedText') return customBlockedTextColor;
    if (colorPickerTarget === 'dismissText') return customDismissColor;
    return '';
  }, [colorPickerTarget, customOverlayBgColor, customBlockedTextColor, customDismissColor]);

  const setActiveColor = useCallback((color: string) => {
    handleColorPickerChange(color);
  }, [handleColorPickerChange]);

  // Pinch-to-resize
  const pinchBaseSize = useRef(0);
  const pinchRafRef = useRef<number | null>(null);

  const handlePreviewPinchStateChange = useCallback(({ nativeEvent }: any) => {
    if (nativeEvent.oldState === GHState.UNDETERMINED && nativeEvent.state === GHState.BEGAN) {
      if (selectedElement === 'blockedText') pinchBaseSize.current = blockedTextSize;
      else if (selectedElement === 'dismissText') pinchBaseSize.current = dismissTextSize;
      else if (selectedElement === 'icon') pinchBaseSize.current = customOverlayImageSize;
      else pinchBaseSize.current = 0;
    }
    if (nativeEvent.state === GHState.END || nativeEvent.state === GHState.CANCELLED) {
      pinchBaseSize.current = 0;
      if (pinchRafRef.current) { cancelAnimationFrame(pinchRafRef.current); pinchRafRef.current = null; }
    }
  }, [selectedElement, blockedTextSize, dismissTextSize, customOverlayImageSize]);

  const handlePreviewPinch = useCallback(({ nativeEvent }: any) => {
    if (!selectedElement || selectedElement === 'background' || pinchBaseSize.current === 0) return;
    if (pinchRafRef.current) return;
    pinchRafRef.current = requestAnimationFrame(() => {
      pinchRafRef.current = null;
      const scale = nativeEvent.scale;
      if (selectedElement === 'blockedText') {
        setBlockedTextSize(Math.max(5, Math.min(20, Math.round(pinchBaseSize.current * scale))));
      } else if (selectedElement === 'dismissText') {
        setDismissTextSize(Math.max(4, Math.min(14, Math.round(pinchBaseSize.current * scale))));
      } else if (selectedElement === 'icon') {
        setCustomOverlayImageSize(Math.max(30, Math.min(300, Math.round(pinchBaseSize.current * scale / 10) * 10)));
      }
    });
  }, [selectedElement]);

  // Sync percentage positions to Animated pixel values (skip during active drag)
  useEffect(() => {
    if (isDragging.current || previewWidth === 0 || previewHeight === 0) return;
    iconPan.setValue({
      x: ((iconPosX - 50) / 100) * previewWidth,
      y: ((iconPosY - 50) / 100) * previewHeight,
    });
    blockedTextPan.setValue({
      x: ((blockedTextPosX - 50) / 100) * previewWidth,
      y: ((blockedTextPosY - 50) / 100) * previewHeight,
    });
    dismissTextPan.setValue({
      x: ((dismissTextPosX - 50) / 100) * previewWidth,
      y: ((dismissTextPosY - 50) / 100) * previewHeight,
    });
  }, [iconPosX, iconPosY, blockedTextPosX, blockedTextPosY, dismissTextPosX, dismissTextPosY, previewWidth, previewHeight]);

  // ============ Image Picker Handler ============
  const handlePickImage = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.8,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        setImageErrorMessage(result.errorMessage || result.errorCode || 'Unknown picker error');
        setImageErrorModalVisible(true);
        return;
      }
      if (!result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      setImageUploading(true);

      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'overlay.jpg',
      } as any);

      const presetId = editingPresetIdRef.current || 'new';
      formData.append('presetId', presetId);

      const response = await fetch(`${API_URL}/api/overlay-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.url) {
        const cacheBustedUrl = `${data.url}?t=${Date.now()}`;
        setCustomOverlayImage(cacheBustedUrl);
      } else {
        setImageErrorMessage(data.error || 'Could not upload image');
        setImageErrorModalVisible(true);
      }
    } catch (error: any) {
      setImageErrorMessage('Failed to pick or upload image');
      setImageErrorModalVisible(true);
    } finally {
      setImageUploading(false);
    }
  }, []);

  // ============ Save Handler ============
  const canSave = useMemo(() => name.trim().length > 0, [name]);

  const handleSave = useCallback(() => {
    if (!canSave || hasSaved.current) return;
    hasSaved.current = true;

    const preset: OverlayPreset = {
      id: editingPresetIdRef.current || '',
      name: name.trim(),
      customBlockedText: customBlockedText.trim() || undefined,
      customDismissText: customDismissText.trim() || undefined,
      customBlockedTextColor: customBlockedTextColor || undefined,
      customOverlayBgColor: customOverlayBgColor || undefined,
      customDismissColor: customDismissColor || undefined,
      customOverlayImage: (iconVisible && customOverlayImage) ? customOverlayImage : undefined,
      customOverlayImageSize: (iconVisible && customOverlayImage) ? customOverlayImageSize : undefined,
      iconPosX: iconPosX !== 50 ? iconPosX : undefined,
      iconPosY: iconPosY !== 30 ? iconPosY : undefined,
      blockedTextPosX: blockedTextPosX !== 50 ? blockedTextPosX : undefined,
      blockedTextPosY: blockedTextPosY !== 50 ? blockedTextPosY : undefined,
      dismissTextPosX: dismissTextPosX !== 50 ? dismissTextPosX : undefined,
      dismissTextPosY: dismissTextPosY !== 70 ? dismissTextPosY : undefined,
      iconVisible: iconVisible === false ? false : undefined,
      blockedTextVisible: blockedTextVisible === false ? false : undefined,
      dismissTextVisible: dismissTextVisible === false ? false : undefined,
      blockedTextSize: blockedTextSize !== 11 ? blockedTextSize : undefined,
      dismissTextSize: dismissTextSize !== 7 ? dismissTextSize : undefined,
    };

    navigation.navigate('Overlays');
    getOnOverlaySave()(preset);
  }, [canSave, name, customBlockedText, customDismissText, customBlockedTextColor, customOverlayBgColor, customDismissColor, customOverlayImage, customOverlayImageSize, iconPosX, iconPosY, blockedTextPosX, blockedTextPosY, dismissTextPosX, dismissTextPosY, iconVisible, blockedTextVisible, dismissTextVisible, blockedTextSize, dismissTextSize, navigation, getOnOverlaySave]);

  const handleBack = useCallback(() => {
    navigation.navigate('Overlays');
  }, [navigation]);

  // ============ Render ============
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
        <HeaderIconButton onPress={handleBack} style={{ width: s(40) }}>
          <BackArrowIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
        </HeaderIconButton>
        <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>
          {editingPresetIdRef.current ? 'Edit Overlay' : 'New Overlay'}
        </Text>
        <HeaderIconButton onPress={handleSave} disabled={!canSave} style={{ width: s(40) }}>
          <FileIcon size={s(iconSize.headerNav)} color={canSave ? '#FFFFFF' : colors.textMuted} />
        </HeaderIconButton>
      </View>

      <ScrollView ref={mainScrollRef} className="flex-1" contentContainerStyle={{ paddingBottom: s(100) }}>
        {/* Name Input */}
        <View className="px-6" style={{ paddingTop: s(20), paddingBottom: s(14) }}>
          <Text style={{ color: colors.text, marginBottom: s(8) }} className={`${textSize.small} ${fontFamily.semibold}`}>Overlay Name</Text>
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card, height: s(44) }} className={radius.xl}>
            <TextInput
              value={name}
              onChangeText={(text) => { if (text.length <= 40) setName(text); }}
              placeholder="e.g. Dark Mode, Motivational..."
              placeholderTextColor={colors.textSecondary}
              maxLength={40}
              style={{ flex: 1, color: colors.text, height: s(44) }}
              className={`px-4 ${textSize.base} ${fontFamily.semibold}`}
            />
          </View>
        </View>

        {/* ---- Interactive Overlay Preview ---- */}
        <View className="px-6" style={{ paddingVertical: s(14) }}>
          <Text style={{ color: '#FFFFFF', marginBottom: s(10) }} className={`${textSize.small} ${fontFamily.semibold}`}>Preview</Text>
          <Text style={{ color: colors.textMuted, marginBottom: s(10) }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
            Drag elements to reposition. Double-tap text to edit. Long-press for options. Pinch to resize.
          </Text>
          <PinchGestureHandler
            onGestureEvent={handlePreviewPinch}
            onHandlerStateChange={handlePreviewPinchStateChange}
          >
          <View
            onLayout={(e: LayoutChangeEvent) => {
              setPreviewWidth(e.nativeEvent.layout.width);
              setPreviewHeight(e.nativeEvent.layout.height);
            }}
            style={{
              alignSelf: 'center',
              width: s(185),
              aspectRatio: 9 / 19.5,
              backgroundColor: customOverlayBgColor || colors.bg,
              borderRadius: s(20),
              overflow: 'hidden',
              borderWidth: s(3),
              borderColor: selectedElement === 'background' ? 'rgba(255,255,255,0.6)' : '#3A3A3C',
            }}
          >
            {/* Background tap layer */}
            <TouchableOpacity
              activeOpacity={1}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 0 }}
              onPress={() => {
                if (!isDragging.current) {
                  setSelectedElement(prev => prev === 'background' ? null : 'background');
                  setEditingText(null);
                  setContextMenuVisible(false);
                }
              }}
              onLongPress={() => {
                setSelectedElement('background');
                setContextMenuTarget('background');
                setContextMenuVisible(true);
                triggerHaptic('impactMedium');
              }}
              delayLongPress={500}
            />

            {/* Grid dots */}
            {previewWidth > 0 && previewHeight > 0 && (
              <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(py => (
                  [10, 20, 30, 40, 50, 60, 70, 80, 90].map(px => (
                    <View
                      key={`${px}-${py}`}
                      style={{
                        position: 'absolute',
                        left: `${px}%`,
                        top: `${py}%`,
                        width: s(3),
                        height: s(3),
                        borderRadius: s(1.5),
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        marginLeft: -s(1.5),
                        marginTop: -s(1.5),
                      }}
                    />
                  ))
                ))}
              </View>
            )}

            {/* Icon layer */}
            {iconVisible && (
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
                <Animated.View
                  style={[
                    { transform: iconPan.getTranslateTransform() },
                    selectedElement === 'icon' && {
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.7)',
                      borderStyle: 'dashed' as const,
                      borderRadius: s(6),
                      padding: s(4),
                    },
                  ]}
                  {...iconPanResponder.panHandlers}
                >
                  {customOverlayImage ? (
                    <Image
                      source={{ uri: customOverlayImage }}
                      style={{ width: s(customOverlayImageSize * 0.5), height: s(customOverlayImageSize * 0.5), borderRadius: s(8) }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialCommunityIcons name="android" size={s(60)} color="#FFFFFF" />
                  )}
                </Animated.View>
              </View>
            )}

            {/* Blocked text layer */}
            {blockedTextVisible && (
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
                <Animated.View
                  style={[
                    { transform: blockedTextPan.getTranslateTransform(), paddingHorizontal: s(8) },
                    selectedElement === 'blockedText' && {
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.7)',
                      borderStyle: 'dashed' as const,
                      borderRadius: s(4),
                      padding: s(4),
                    },
                  ]}
                  {...(editingText !== 'blockedText' ? blockedTextPanResponder.panHandlers : {})}
                >
                  {editingText === 'blockedText' ? (
                    <TextInput
                      ref={editInputRef}
                      value={customBlockedText}
                      onChangeText={(text) => {
                        if (text.length <= 200) setCustomBlockedText(text);
                      }}
                      style={{
                        color: customBlockedTextColor || '#FFFFFF',
                        textAlign: 'center',
                        fontSize: s(blockedTextSize),
                        lineHeight: s(blockedTextSize * 1.4),
                        padding: 0,
                        minWidth: s(60),
                      }}
                      className={fontFamily.bold}
                      autoFocus
                      multiline
                      onBlur={() => setEditingText(null)}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      placeholder="Blocked text..."
                    />
                  ) : (
                    <Text style={{
                      color: customBlockedTextColor || '#FFFFFF',
                      textAlign: 'center',
                      fontSize: s(blockedTextSize),
                      lineHeight: s(blockedTextSize * 1.4),
                    }} className={fontFamily.bold}>
                      {customBlockedText.trim() || 'This app is blocked.'}
                    </Text>
                  )}
                </Animated.View>
              </View>
            )}

            {/* Dismiss text layer */}
            {dismissTextVisible && (
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
                <Animated.View
                  style={[
                    { transform: dismissTextPan.getTranslateTransform() },
                    selectedElement === 'dismissText' && {
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.7)',
                      borderStyle: 'dashed' as const,
                      borderRadius: s(4),
                      padding: s(4),
                    },
                  ]}
                  {...(editingText !== 'dismissText' ? dismissTextPanResponder.panHandlers : {})}
                >
                  {editingText === 'dismissText' ? (
                    <TextInput
                      ref={editInputRef}
                      value={customDismissText}
                      onChangeText={(text) => {
                        if (text.length <= 100) setCustomDismissText(text);
                      }}
                      style={{
                        color: customDismissColor || 'rgba(255,255,255,0.5)',
                        fontSize: s(dismissTextSize),
                        padding: 0,
                        minWidth: s(60),
                      }}
                      className={fontFamily.bold}
                      autoFocus
                      onBlur={() => setEditingText(null)}
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      placeholder="Dismiss text..."
                    />
                  ) : (
                    <Text style={{
                      color: customDismissColor || '#FFFFFF',
                      fontSize: s(dismissTextSize),
                      opacity: customDismissColor ? 1 : 0.5,
                    }} className={fontFamily.bold}>
                      {customDismissText.trim() || 'Tap anywhere to dismiss'}
                    </Text>
                  )}
                </Animated.View>
              </View>
            )}
          </View>
          </PinchGestureHandler>

          {/* Context Menu */}
          {contextMenuVisible && contextMenuTarget && (
            <View style={{
              flexDirection: 'row',
              alignSelf: 'center',
              marginTop: s(10),
              backgroundColor: colors.card,
              borderRadius: s(12),
              paddingVertical: s(8),
              paddingHorizontal: s(12),
              ...shadow.card,
              gap: s(8),
            }}>
              {contextMenuTarget !== 'icon' && (
                <TouchableOpacity
                  onPress={() => {
                    setColorPickerTarget(contextMenuTarget);
                    setContextMenuVisible(false);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: s(8),
                    paddingHorizontal: s(10),
                    paddingVertical: s(6),
                  }}
                >
                  <BoxiconsFilled name="bx-palette" size={s(16)} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', marginLeft: s(6) }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>Color</Text>
                </TouchableOpacity>
              )}
              {contextMenuTarget === 'icon' && (
                <TouchableOpacity
                  onPress={() => {
                    handlePickImage();
                    setContextMenuVisible(false);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: s(8),
                    paddingHorizontal: s(10),
                    paddingVertical: s(6),
                  }}
                >
                  <BoxiconsFilled name="bx-image-plus" size={s(16)} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', marginLeft: s(6) }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>Change Image</Text>
                </TouchableOpacity>
              )}
              {contextMenuTarget !== 'background' && (
                <TouchableOpacity
                  onPress={() => {
                    if (contextMenuTarget === 'icon') setIconVisible(false);
                    else if (contextMenuTarget === 'blockedText') setBlockedTextVisible(false);
                    else if (contextMenuTarget === 'dismissText') setDismissTextVisible(false);
                    setContextMenuVisible(false);
                    setSelectedElement(null);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(239,68,68,0.2)',
                    borderRadius: s(8),
                    paddingHorizontal: s(10),
                    paddingVertical: s(6),
                  }}
                >
                  <Svg width={s(16)} height={s(16)} viewBox="0 0 24 24" fill={colors.red}>
                    <Path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"
                    />
                  </Svg>
                  <Text style={{ color: colors.red, marginLeft: s(6) }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Inline Color Picker */}
          {colorPickerTarget && (
            <View style={{ marginTop: s(10) }}>
              <View className="flex-row items-center justify-between" style={{ marginBottom: s(8) }}>
                <Text style={{ color: '#FFFFFF' }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>
                  {colorPickerTarget === 'background' ? 'Background' : colorPickerTarget === 'blockedText' ? 'Blocked Message' : 'Dismiss Message'} Color
                </Text>
                <TouchableOpacity onPress={() => setColorPickerTarget(null)} activeOpacity={0.7}>
                  <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>Done</Text>
                </TouchableOpacity>
              </View>
              <View
                onLayout={(e: LayoutChangeEvent) => setColorPickerActiveWidth(e.nativeEvent.layout.width)}
                {...activeColorPanResponder.panHandlers}
              >
                <View style={{ height: s(28), borderRadius: s(14), overflow: 'hidden', ...shadow.card }}>
                  <LinearGradient
                    colors={SPECTRUM_COLORS}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
              <View className="flex-row items-center" style={{ marginTop: s(10) }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card, height: s(38) }} className={radius.xl}>
                  <View style={{ width: s(16), height: s(16), borderRadius: s(8), backgroundColor: getActiveColor() || '#FFFFFF', marginLeft: s(12) }} />
                  <TextInput
                    value={getActiveColor()}
                    onChangeText={(text) => {
                      let cleaned = text.replace(/[^#0-9A-Fa-f]/g, '').toUpperCase();
                      if (!cleaned.startsWith('#')) cleaned = '#' + cleaned;
                      if (cleaned.length <= 7) setActiveColor(cleaned);
                    }}
                    placeholder="#FFFFFF"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={7}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={{ flex: 1, color: colors.text, height: s(38) }}
                    className={`px-3 ${textSize.extraSmall} ${fontFamily.semibold}`}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (colorPickerTarget === 'background') {
                      setCustomOverlayBgColor('');
                    } else if (colorPickerTarget === 'blockedText') {
                      setCustomBlockedTextColor('');
                    } else if (colorPickerTarget === 'dismissText') {
                      setCustomDismissColor('');
                    }
                  }}
                  activeOpacity={0.7}
                  style={{ marginLeft: s(10) }}
                >
                  <BoxiconsFilled name="bx-refresh-cw-alt" size={s(iconSize.headerNav)} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Hidden Elements Restore */}
          {(!iconVisible || !blockedTextVisible || !dismissTextVisible) && (
            <View style={{ marginTop: s(10), flexDirection: 'row', flexWrap: 'wrap', gap: s(8), justifyContent: 'center' }}>
              {!iconVisible && (
                <TouchableOpacity
                  onPress={() => setIconVisible(true)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: s(8),
                    paddingHorizontal: s(10),
                    paddingVertical: s(6),
                  }}
                >
                  <BoxiconsFilled name="bx-plus" size={s(14)} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, marginLeft: s(4) }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>Icon</Text>
                </TouchableOpacity>
              )}
              {!blockedTextVisible && (
                <TouchableOpacity
                  onPress={() => setBlockedTextVisible(true)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: s(8),
                    paddingHorizontal: s(10),
                    paddingVertical: s(6),
                  }}
                >
                  <BoxiconsFilled name="bx-plus" size={s(14)} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, marginLeft: s(4) }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>Blocked Message</Text>
                </TouchableOpacity>
              )}
              {!dismissTextVisible && (
                <TouchableOpacity
                  onPress={() => setDismissTextVisible(true)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: s(8),
                    paddingHorizontal: s(10),
                    paddingVertical: s(6),
                  }}
                >
                  <BoxiconsFilled name="bx-plus" size={s(14)} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, marginLeft: s(4) }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>Dismiss Message</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Reset positions button */}
          {(iconPosX !== 50 || iconPosY !== 30 || blockedTextPosX !== 50 || blockedTextPosY !== 50 || dismissTextPosX !== 50 || dismissTextPosY !== 70) && (
            <TouchableOpacity
              onPress={() => {
                setIconPosX(50); setIconPosY(30);
                setBlockedTextPosX(50); setBlockedTextPosY(50);
                setDismissTextPosX(50); setDismissTextPosY(70);
              }}
              activeOpacity={0.7}
              style={{ alignSelf: 'center', marginTop: s(10) }}
              className="flex-row items-center"
            >
              <BoxiconsFilled name="bx-refresh-cw-alt" size={s(iconSize.sm)} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginLeft: s(4) }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>Reset Layout</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Image Upload Error Modal */}
      <InfoModal
        visible={imageErrorModalVisible}
        title="Image Upload Error"
        message={imageErrorMessage}
        onClose={() => setImageErrorModalVisible(false)}
      />
    </View>
  );
}

export default memo(OverlayEditorScreen);
