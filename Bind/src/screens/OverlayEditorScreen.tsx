import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Image,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

// ============ Constants (matching Android overlay_blocked.xml) ============
const OVERLAY_DEFAULT_BG = '#28282B';
const DEFAULT_BLOCKED_TEXT_SIZE = 22;
const DEFAULT_DISMISS_TEXT_SIZE = 10;

// ============ Grid / Gesture Constants ============
const GRID_SNAP = 1;
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
  const [iconPosY, setIconPosY] = useState(42);
  const [blockedTextPosX, setBlockedTextPosX] = useState(50);
  const [blockedTextPosY, setBlockedTextPosY] = useState(57);
  const [dismissTextPosX, setDismissTextPosX] = useState(50);
  const [dismissTextPosY, setDismissTextPosY] = useState(63);
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
  const [blockedTextSize, setBlockedTextSize] = useState(DEFAULT_BLOCKED_TEXT_SIZE);
  const [dismissTextSize, setDismissTextSize] = useState(DEFAULT_DISMISS_TEXT_SIZE);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuTarget, setContextMenuTarget] = useState<PreviewElement | null>(null);
  const [colorPickerTarget, setColorPickerTarget] = useState<PreviewElement | null>(null);
  const [colorPickerActiveWidth, setColorPickerActiveWidth] = useState(0);
  const editInputRef = useRef<TextInput>(null);
  const lastTapTimeRef = useRef<Record<string, number>>({});

  // Save modal state
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  // Refs for current values (used in gesture callbacks — always current)
  const hasSaved = useRef(false);
  const editingPresetIdRef = useRef<string | null>(null);

  const previewWidthRef = useRef(0);
  const previewHeightRef = useRef(0);
  previewWidthRef.current = previewWidth;
  previewHeightRef.current = previewHeight;

  const selectedElementRef = useRef<PreviewElement | null>(null);
  selectedElementRef.current = selectedElement;

  const blockedTextSizeRef = useRef(DEFAULT_BLOCKED_TEXT_SIZE);
  blockedTextSizeRef.current = blockedTextSize;

  const dismissTextSizeRef = useRef(DEFAULT_DISMISS_TEXT_SIZE);
  dismissTextSizeRef.current = dismissTextSize;

  const customOverlayImageSizeRef = useRef(120);
  customOverlayImageSizeRef.current = customOverlayImageSize;

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
        setIconPosY(preset.iconPosY ?? 42);
        setBlockedTextPosX(preset.blockedTextPosX ?? 50);
        setBlockedTextPosY(preset.blockedTextPosY ?? 57);
        setDismissTextPosX(preset.dismissTextPosX ?? 50);
        setDismissTextPosY(preset.dismissTextPosY ?? 63);
        setIconVisible(preset.iconVisible ?? true);
        setBlockedTextVisible(preset.blockedTextVisible ?? true);
        setDismissTextVisible(preset.dismissTextVisible ?? true);
        setBlockedTextSize(preset.blockedTextSize ?? DEFAULT_BLOCKED_TEXT_SIZE);
        setDismissTextSize(preset.dismissTextSize ?? DEFAULT_DISMISS_TEXT_SIZE);
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
        setIconPosY(42);
        setBlockedTextPosX(50);
        setBlockedTextPosY(57);
        setDismissTextPosX(50);
        setDismissTextPosY(63);
        setIconVisible(true);
        setBlockedTextVisible(true);
        setDismissTextVisible(true);
        setBlockedTextSize(DEFAULT_BLOCKED_TEXT_SIZE);
        setDismissTextSize(DEFAULT_DISMISS_TEXT_SIZE);
      }

      // Reset UI state
      setSelectedElement(null);
      setEditingText(null);
      setContextMenuVisible(false);
      setColorPickerTarget(null);
      setSaveModalVisible(false);
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

  // Throttled color picker PanResponder factory (kept as PanResponder — no conflict with pinch)
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

  // ============ Gesture API — Element Gesture Factory ============
  // All callbacks use refs to access latest values (avoids stale closures)
  const makeElementGesture = useCallback((
    elementKey: PreviewElement,
    pan: Animated.ValueXY,
    currentPosXRef: React.MutableRefObject<number>,
    currentPosYRef: React.MutableRefObject<number>,
    setPosX: (x: number) => void,
    setPosY: (y: number) => void,
  ) => {
    // Mutable drag start position — persists across gesture callbacks
    const startOffset = { x: 0, y: 0 };

    const panGesture = Gesture.Pan()
      .runOnJS(true)
      .maxPointers(1) // Single-finger only — leaves 2-finger for pinch
      .activeOffsetX([-DRAG_THRESHOLD, DRAG_THRESHOLD])
      .activeOffsetY([-DRAG_THRESHOLD, DRAG_THRESHOLD])
      .onStart(() => {
        const pw = previewWidthRef.current;
        const ph = previewHeightRef.current;
        startOffset.x = ((currentPosXRef.current - 50) / 100) * pw;
        startOffset.y = ((currentPosYRef.current - 50) / 100) * ph;
        isDragging.current = true;
        setSelectedElement(elementKey);
        setEditingText(null);
        setContextMenuVisible(false);
      })
      .onUpdate((e) => {
        // Direct setValue — no setOffset/flattenOffset dance (fixes flicker)
        pan.setValue({
          x: startOffset.x + e.translationX,
          y: startOffset.y + e.translationY,
        });
      })
      .onEnd((e) => {
        const pw = previewWidthRef.current;
        const ph = previewHeightRef.current;
        if (pw > 0 && ph > 0) {
          const finalX = startOffset.x + e.translationX;
          const finalY = startOffset.y + e.translationY;
          const rawPctX = 50 + (finalX / pw) * 100;
          const rawPctY = 50 + (finalY / ph) * 100;
          const snappedX = Math.max(0, Math.min(100, Math.round(rawPctX / GRID_SNAP) * GRID_SNAP));
          const snappedY = Math.max(0, Math.min(100, Math.round(rawPctY / GRID_SNAP) * GRID_SNAP));
          const free = findFreePosition(snappedX, snappedY, elementKey);
          setPosX(free.x);
          setPosY(free.y);
          const snapPixelX = ((free.x - 50) / 100) * pw;
          const snapPixelY = ((free.y - 50) / 100) * ph;
          Animated.spring(pan, {
            toValue: { x: snapPixelX, y: snapPixelY },
            useNativeDriver: false,
            friction: 7,
          }).start(() => { isDragging.current = false; });
        } else {
          isDragging.current = false;
        }
      });

    const longPressGesture = Gesture.LongPress()
      .runOnJS(true)
      .minDuration(LONG_PRESS_MS)
      .onStart(() => {
        setSelectedElement(elementKey);
        setContextMenuTarget(elementKey);
        setContextMenuVisible(true);
        triggerHaptic('impactMedium');
      });

    const isTextElement = elementKey === 'blockedText' || elementKey === 'dismissText';

    const doubleTapGesture = Gesture.Tap()
      .runOnJS(true)
      .numberOfTaps(2)
      .maxDelay(DOUBLE_TAP_MS)
      .onEnd(() => {
        if (isTextElement) {
          setSelectedElement(elementKey);
          setEditingText(elementKey as 'blockedText' | 'dismissText');
        }
      });

    const singleTapGesture = Gesture.Tap()
      .runOnJS(true)
      .numberOfTaps(1)
      .onEnd(() => {
        setSelectedElement(prev => prev === elementKey ? null : elementKey);
        setEditingText(null);
        setContextMenuVisible(false);
      });

    // Double tap takes priority over single tap for text elements
    const taps = isTextElement
      ? Gesture.Exclusive(doubleTapGesture, singleTapGesture)
      : singleTapGesture;

    // Race: first gesture to activate wins, others cancelled
    return Gesture.Race(panGesture, longPressGesture, taps);
  }, [findFreePosition]);

  // Create element gestures (stable — all values accessed via refs)
  const iconGesture = useMemo(
    () => makeElementGesture('icon', iconPan, iconPosXRef, iconPosYRef, setIconPosX, setIconPosY),
    [makeElementGesture]
  );

  const blockedTextGesture = useMemo(
    () => makeElementGesture('blockedText', blockedTextPan, blockedTextPosXRef, blockedTextPosYRef, setBlockedTextPosX, setBlockedTextPosY),
    [makeElementGesture]
  );

  const dismissTextGesture = useMemo(
    () => makeElementGesture('dismissText', dismissTextPan, dismissTextPosXRef, dismissTextPosYRef, setDismissTextPosX, setDismissTextPosY),
    [makeElementGesture]
  );

  // ============ Background Gesture ============
  const backgroundGesture = useMemo(() => {
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd(() => {
        if (!isDragging.current) {
          setSelectedElement(prev => prev === 'background' ? null : 'background');
          setEditingText(null);
          setContextMenuVisible(false);
        }
      });

    const longPress = Gesture.LongPress()
      .runOnJS(true)
      .minDuration(500)
      .onStart(() => {
        setSelectedElement('background');
        setContextMenuTarget('background');
        setContextMenuVisible(true);
        triggerHaptic('impactMedium');
      });

    return Gesture.Race(longPress, tap);
  }, []);

  // ============ Pinch Gesture (on parent — works with 2 fingers) ============
  const pinchBaseSize = useRef(0);

  const pinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        const sel = selectedElementRef.current;
        if (sel === 'blockedText') pinchBaseSize.current = blockedTextSizeRef.current;
        else if (sel === 'dismissText') pinchBaseSize.current = dismissTextSizeRef.current;
        else if (sel === 'icon') pinchBaseSize.current = customOverlayImageSizeRef.current;
        else pinchBaseSize.current = 0;
      })
      .onUpdate((e) => {
        if (pinchBaseSize.current === 0) return;
        const sel = selectedElementRef.current;
        const scale = e.scale;
        if (sel === 'blockedText') {
          setBlockedTextSize(Math.max(8, Math.min(36, Math.round(pinchBaseSize.current * scale))));
        } else if (sel === 'dismissText') {
          setDismissTextSize(Math.max(5, Math.min(20, Math.round(pinchBaseSize.current * scale))));
        } else if (sel === 'icon') {
          setCustomOverlayImageSize(Math.max(30, Math.min(300, Math.round(pinchBaseSize.current * scale / 10) * 10)));
        }
      })
      .onEnd(() => {
        pinchBaseSize.current = 0;
      });
  }, []);

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
    setSaveModalVisible(true);
  }, []);

  const handleConfirmSave = useCallback(() => {
    if (!canSave || hasSaved.current) return;
    hasSaved.current = true;
    setSaveModalVisible(false);

    const preset: OverlayPreset = {
      id: editingPresetIdRef.current || `overlay-${Date.now()}`,
      name: name.trim(),
      customBlockedText: customBlockedText.trim() || undefined,
      customDismissText: customDismissText.trim() || undefined,
      customBlockedTextColor: customBlockedTextColor || undefined,
      customOverlayBgColor: customOverlayBgColor || undefined,
      customDismissColor: customDismissColor || undefined,
      customOverlayImage: (iconVisible && customOverlayImage) ? customOverlayImage : undefined,
      customOverlayImageSize: (iconVisible && customOverlayImage) ? customOverlayImageSize : undefined,
      iconPosX: iconPosX !== 50 ? iconPosX : undefined,
      iconPosY: iconPosY !== 42 ? iconPosY : undefined,
      blockedTextPosX: blockedTextPosX !== 50 ? blockedTextPosX : undefined,
      blockedTextPosY: blockedTextPosY !== 57 ? blockedTextPosY : undefined,
      dismissTextPosX: dismissTextPosX !== 50 ? dismissTextPosX : undefined,
      dismissTextPosY: dismissTextPosY !== 63 ? dismissTextPosY : undefined,
      iconVisible: iconVisible === false ? false : undefined,
      blockedTextVisible: blockedTextVisible === false ? false : undefined,
      dismissTextVisible: dismissTextVisible === false ? false : undefined,
      blockedTextSize: blockedTextSize !== DEFAULT_BLOCKED_TEXT_SIZE ? blockedTextSize : undefined,
      dismissTextSize: dismissTextSize !== DEFAULT_DISMISS_TEXT_SIZE ? dismissTextSize : undefined,
    };

    navigation.navigate('Overlays');
    getOnOverlaySave()(preset);
  }, [canSave, name, customBlockedText, customDismissText, customBlockedTextColor, customOverlayBgColor, customDismissColor, customOverlayImage, customOverlayImageSize, iconPosX, iconPosY, blockedTextPosX, blockedTextPosY, dismissTextPosX, dismissTextPosY, iconVisible, blockedTextVisible, dismissTextVisible, blockedTextSize, dismissTextSize, navigation, getOnOverlaySave]);

  const handleBack = useCallback(() => {
    navigation.navigate('Overlays');
  }, [navigation]);

  // ============ Render ============
  return (
    <View style={{ flex: 1, backgroundColor: customOverlayBgColor || OVERLAY_DEFAULT_BG }}>
      {/* Full-screen interactive preview — pinch wraps everything */}
      <GestureDetector gesture={pinchGesture}>
        <View
          style={{ flex: 1 }}
          onLayout={(e: LayoutChangeEvent) => {
            setPreviewWidth(e.nativeEvent.layout.width);
            setPreviewHeight(e.nativeEvent.layout.height);
          }}
        >
          {/* Background tap/long-press layer */}
          <GestureDetector gesture={backgroundGesture}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 0 }} />
          </GestureDetector>

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
              <GestureDetector gesture={iconGesture}>
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
                >
                  {customOverlayImage ? (
                    <Image
                      source={{ uri: customOverlayImage }}
                      style={{ width: customOverlayImageSize, height: customOverlayImageSize, borderRadius: s(8) }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialCommunityIcons name="android" size={customOverlayImageSize} color="#FFFFFF" />
                  )}
                </Animated.View>
              </GestureDetector>
            </View>
          )}

          {/* Blocked text layer */}
          {blockedTextVisible && (
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
              {editingText === 'blockedText' ? (
                <Animated.View
                  style={[
                    { transform: blockedTextPan.getTranslateTransform(), paddingHorizontal: s(8) },
                    {
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.7)',
                      borderStyle: 'dashed' as const,
                      borderRadius: s(4),
                      padding: s(4),
                    },
                  ]}
                >
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
                      lineHeight: s(blockedTextSize * 1.3),
                      padding: 0,
                      minWidth: s(60),
                    }}
                    className={fontFamily.bold}
                    autoFocus
                    multiline
                    onBlur={() => setEditingText(null)}
                  />
                </Animated.View>
              ) : (
                <GestureDetector gesture={blockedTextGesture}>
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
                  >
                    <Text style={{
                      color: customBlockedTextColor || '#FFFFFF',
                      textAlign: 'center',
                      fontSize: s(blockedTextSize),
                      lineHeight: s(blockedTextSize * 1.3),
                    }} className={fontFamily.bold}>
                      {customBlockedText.trim() || 'This app is blocked.'}
                    </Text>
                  </Animated.View>
                </GestureDetector>
              )}
            </View>
          )}

          {/* Dismiss text layer */}
          {dismissTextVisible && (
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
              {editingText === 'dismissText' ? (
                <Animated.View
                  style={[
                    { transform: dismissTextPan.getTranslateTransform() },
                    {
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.7)',
                      borderStyle: 'dashed' as const,
                      borderRadius: s(4),
                      padding: s(4),
                    },
                  ]}
                >
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
                  />
                </Animated.View>
              ) : (
                <GestureDetector gesture={dismissTextGesture}>
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
                  >
                    <Text style={{
                      color: customDismissColor || '#FFFFFF',
                      fontSize: s(dismissTextSize),
                      opacity: customDismissColor ? 1 : 0.5,
                    }} className={fontFamily.bold}>
                      {customDismissText.trim() || 'Tap anywhere to dismiss'}
                    </Text>
                  </Animated.View>
                </GestureDetector>
              )}
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Floating back button — top-left */}
      <View style={{ position: 'absolute', top: insets.top + s(16), left: s(16) }}>
        <HeaderIconButton onPress={handleBack}>
          <BackArrowIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
        </HeaderIconButton>
      </View>

      {/* Floating save button — top-right */}
      <View style={{ position: 'absolute', top: insets.top + s(16), right: s(16) }}>
        <HeaderIconButton onPress={handleSave}>
          <FileIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
        </HeaderIconButton>
      </View>

      {/* Floating context menu */}
      {contextMenuVisible && contextMenuTarget && (
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + s(100),
          left: 0,
          right: 0,
          alignItems: 'center',
        }}>
          <View style={{
            flexDirection: 'row',
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
        </View>
      )}

      {/* Floating color picker */}
      {colorPickerTarget && (
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + s(20),
          left: s(16),
          right: s(16),
          backgroundColor: 'rgba(30,30,30,0.9)',
          borderRadius: s(16),
          padding: s(14),
          ...shadow.card,
        }}>
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

      {/* Floating hidden elements restore */}
      {!colorPickerTarget && (!iconVisible || !blockedTextVisible || !dismissTextVisible) && (
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + s(20),
          left: 0,
          right: 0,
          alignItems: 'center',
        }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s(8), justifyContent: 'center' }}>
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
        </View>
      )}

      {/* Floating reset layout */}
      {!colorPickerTarget && (iconPosX !== 50 || iconPosY !== 42 || blockedTextPosX !== 50 || blockedTextPosY !== 57 || dismissTextPosX !== 50 || dismissTextPosY !== 63) && (
        <View style={{
          position: 'absolute',
          top: insets.top + s(20),
          left: 0,
          right: 0,
          alignItems: 'center',
        }}>
          <TouchableOpacity
            onPress={() => {
              setIconPosX(50); setIconPosY(42);
              setBlockedTextPosX(50); setBlockedTextPosY(57);
              setDismissTextPosX(50); setDismissTextPosY(63);
            }}
            activeOpacity={0.7}
            className="flex-row items-center"
          >
            <BoxiconsFilled name="bx-refresh-cw-alt" size={s(iconSize.sm)} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', marginLeft: s(4) }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>Reset Layout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Save Name Modal */}
      <Modal
        visible={saveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-8">
          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadow.modal,
              width: '100%',
            }}
            className={`${radius['2xl']} overflow-hidden`}
          >
            <View className="p-6">
              <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-4`}>
                Name Your Overlay
              </Text>
              <View style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, height: s(44) }} className={radius.xl}>
                <TextInput
                  value={name}
                  onChangeText={(text) => { if (text.length <= 40) setName(text); }}
                  placeholder="e.g. Dark Mode, Motivational..."
                  placeholderTextColor={colors.textSecondary}
                  maxLength={40}
                  autoFocus
                  style={{ flex: 1, color: colors.text, height: s(44) }}
                  className={`px-4 ${textSize.base} ${fontFamily.semibold}`}
                />
              </View>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }} className="flex-row">
              <TouchableOpacity
                onPress={() => setSaveModalVisible(false)}
                activeOpacity={0.7}
                style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
                className="flex-1 py-4 items-center justify-center"
              >
                <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmSave}
                activeOpacity={0.7}
                disabled={!canSave}
                className="flex-1 py-4 items-center justify-center"
              >
                <Text style={{ color: canSave ? colors.text : colors.textMuted }} className={`${textSize.small} ${fontFamily.semibold}`}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
