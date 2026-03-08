import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TextInput,
  Image,
} from 'react-native';
import AnimatedSwitch from '../components/AnimatedSwitch';
import FlashPressable from '../components/FlashPressable';
import { useFlashPress } from '../utils/useFlashPress';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { XCircleIcon, CheckCircleIcon, ImageIcon, ImageSquareIcon, AndroidLogoIcon, InfoIcon as PhosphorInfoIcon, ArticleNyTimesIcon, HeartStraightBreakIcon } from 'phosphor-react-native';
import SettingsCogIcon from '../components/SettingsCogIcon';
import ReplyArrowIcon from '../components/ReplyArrowIcon';
import { launchImageLibrary } from 'react-native-image-picker';
import { API_URL } from '../config/api';
import { getAuthToken } from '../services/cardApi';
import InfoModal from '../components/InfoModal';
import DisableTapoutWarningModal from '../components/DisableTapoutWarningModal';
import BlockSettingsWarningModal from '../components/BlockSettingsWarningModal';
import StrictModeWarningModal from '../components/StrictModeWarningModal';
import { Preset } from '../components/PresetCard';
import HeaderIconButton from '../components/HeaderIconButton';
import { useAuth } from '../context/AuthContext';
import { useTheme, textSize, fontFamily, radius, shadow, iconSize, buttonPadding, haptics, pill } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import { usePresetSave } from '../navigation/PresetsStack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/types';

// ============ AsyncStorage Keys ============
const DISABLE_TAPOUT_WARNING_DISMISSED_KEY = 'disable_tapout_warning_dismissed';
const BLOCK_SETTINGS_WARNING_DISMISSED_KEY = 'block_settings_warning_dismissed';
const STRICT_MODE_WARNING_DISMISSED_KEY = 'strict_mode_warning_dismissed';

// ============ Recurring schedule unit types ============
type RecurringUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

// ============ Icon Components ============
const BackArrowIcon = ({ size = iconSize.lg, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <ReplyArrowIcon size={size} color={color} direction="left" />
);

const XIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <XCircleIcon size={size} color={color} weight="fill" />
);

const SaveIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M5 21h14c1.1 0 2-.9 2-2V8c0-.27-.11-.52-.29-.71l-4-4A1 1 0 0 0 16 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2M7 5h4v2h2V5h2v4H7zm0 8c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v6H7z" />
  </Svg>
);

const CheckIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <CheckCircleIcon size={size} color={color} weight="fill" />
);

const HourglassIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path fillRule="evenodd" clipRule="evenodd" d="M1.946 7.139C3.04 5.572 4.552 4.5 6 4.5c1.654 0 3.116 1.08 4.338 2.333 1.255 1.286 2.467 2.977 3.598 4.594l0.379 0.541c1.01 1.45 1.956 2.804 2.865 3.842 0.508 0.58 0.97 1.02 1.387 1.31 0.42 0.291 0.723 0.38 0.933 0.38 0.684 0 1.273 -0.272 1.71 -0.805 0.449 -0.547 0.79 -1.44 0.79 -2.739 0 -2.5 -0.707 -4.412 -1.587 -5.673C19.495 6.966 18.51 6.5 18 6.5c-0.784 0 -1.734 0.535 -2.879 1.7a1 1 0 1 1 -1.427 -1.4C14.908 5.563 16.36 4.5 18 4.5c1.448 0 2.961 1.072 4.054 2.639C23.185 8.76 24 11.077 24 13.956c0 1.636 -0.43 3.016 -1.243 4.007A4.136 4.136 0 0 1 19.5 19.5c-0.769 0 -1.468 -0.317 -2.073 -0.737 -0.608 -0.421 -1.193 -0.997 -1.752 -1.635 -0.987 -1.128 -2 -2.581 -2.998 -4.012l-0.38 -0.543c-1.143 -1.633 -2.266 -3.192 -3.39 -4.343C7.75 7.045 6.792 6.5 6 6.5c-0.509 0 -1.495 0.466 -2.414 1.783C2.706 9.544 2 11.455 2 13.957c0 1.298 0.341 2.19 0.79 2.738a2.137 2.137 0 0 0 1.71 0.805c0.385 0 0.991 -0.297 1.862 -1.192 0.829 -0.852 1.708 -2.04 2.655 -3.384a1 1 0 0 1 1.635 1.152c-0.942 1.337 -1.904 2.648 -2.857 3.627 -0.91 0.935 -2.027 1.797 -3.295 1.797a4.136 4.136 0 0 1 -3.257 -1.537C0.43 16.972 0 15.593 0 13.956 0 11.078 0.815 8.76 1.946 7.14Z" />
  </Svg>
);

const PickDateIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path fillRule="evenodd" clipRule="evenodd" d="M8.375 1.035a1 1 0 0 0 -2 -0.02l0 0.02V5.54a0.75 0.75 0 1 1 -1.5 0V3H2.518C1.188 3.001 0.059 4.129 0.059 5.46v16.046c0 1.33 1.129 2.46 2.459 2.46h18.964c1.33 0 2.459 -1.13 2.459 -2.46V5.46C23.94 4.13 22.812 3 21.482 3h-2.607V1.035a1 1 0 0 0 -2 -0.02l0 0.02V5.54a0.75 0.75 0 0 1 -1.5 0V3h-7V1.035ZM2.059 21.506V9.476h19.882v12.03c0 0.226 -0.233 0.46 -0.459 0.46H2.518c-0.226 0 -0.459 -0.234 -0.459 -0.46Zm9.426 -9.021a1 1 0 0 1 0.88 0.645l0.511 1.35 5.688 -1.896a1 1 0 0 1 0.633 1.898l-5.614 1.87 0.483 1.278a1 1 0 0 1 -1.343 1.266l-3.25 -1.45a0.996 0.996 0 0 1 -0.527 -0.558l-0.008 -0.021a0.997 0.997 0 0 1 0.054 -0.792l1.547 -3.045a1 1 0 0 1 0.946 -0.545ZM4.62 17.983c0 -0.796 0.64 -1.436 1.436 -1.436 0.796 0 1.436 0.64 1.436 1.436 0 0.796 -0.64 1.436 -1.436 1.436 -0.797 0 -1.436 -0.64 -1.436 -1.436Z" />
  </Svg>
);

const StartDateIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path fillRule="evenodd" clipRule="evenodd" d="M8.375 1.035a1 1 0 0 0 -2 -0.02l0 0.02V5.54a0.75 0.75 0 1 1 -1.5 0V3H2.518C1.188 3.001 0.059 4.129 0.059 5.46v16.046c0 1.33 1.129 2.46 2.459 2.46h18.964c1.33 0 2.459 -1.13 2.459 -2.46V5.46C23.94 4.13 22.812 3 21.482 3h-2.607V1.035a1 1 0 0 0 -2 -0.02l0 0.02V5.54a0.75 0.75 0 0 1 -1.5 0V3h-7V1.035ZM2.059 21.506V9.476h19.882v12.03c0 0.226 -0.233 0.46 -0.459 0.46H2.518c-0.226 0 -0.459 -0.234 -0.459 -0.46Zm18.197 -10.23a1 1 0 0 1 0 1.414l-2.232 2.232a1 1 0 0 1 -1.414 0l-1.116 -1.116a1 1 0 0 1 1.414 -1.414l0.409 0.408 1.524 -1.524a1 1 0 0 1 1.415 0ZM12 11.853c-0.796 0 -1.436 0.64 -1.436 1.436 0 0.796 0.64 1.436 1.436 1.436 0.796 0 1.436 -0.64 1.436 -1.436 0 -0.796 -0.64 -1.436 -1.436 -1.436Zm0 5.547c-0.796 0 -1.436 0.64 -1.436 1.436 0 0.796 0.64 1.436 1.436 1.436 0.796 0 1.436 -0.64 1.436 -1.436 0 -0.796 -0.64 -1.436 -1.436 -1.436Zm5.538 0c-0.796 0 -1.436 0.64 -1.436 1.436 0 0.796 0.64 1.436 1.436 1.436 0.796 0 1.436 -0.64 1.436 -1.436 0 -0.796 -0.64 -1.436 -1.436 -1.436Zm-11.076 0c-0.796 0 -1.436 0.64 -1.436 1.436 0 0.796 0.64 1.436 1.436 1.436 0.796 0 1.436 -0.64 1.436 -1.436 0 -0.796 -0.64 -1.436 -1.436 -1.436Zm-0.023 -5.523c-0.796 0 -1.436 0.64 -1.436 1.436 0 0.796 0.64 1.436 1.436 1.436 0.796 0 1.436 -0.64 1.436 -1.436 0 -0.796 -0.64 -1.436 -1.436 -1.436Z" />
  </Svg>
);

const EndDateIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path fillRule="evenodd" clipRule="evenodd" d="M8.375 1.035a1 1 0 0 0 -2 -0.02l0 0.02V5.54a0.75 0.75 0 1 1 -1.5 0V3H2.518C1.188 3.001 0.059 4.129 0.059 5.46v16.046c0 1.33 1.129 2.46 2.459 2.46h18.964c1.33 0 2.459 -1.13 2.459 -2.46V5.46C23.94 4.13 22.812 3 21.482 3h-2.607V1.035a1 1 0 0 0 -2 -0.02l0 0.02V5.54a0.75 0.75 0 0 1 -1.5 0V3h-7V1.035ZM2.059 21.506V9.476h19.882v12.03c0 0.226 -0.233 0.46 -0.459 0.46H2.518c-0.226 0 -0.459 -0.234 -0.459 -0.46Zm17.598 -8.921a1 1 0 0 0 -1.414 -1.415l-0.705 0.705 -0.704 -0.704a1 1 0 0 0 -1.414 1.414l0.704 0.704 -0.704 0.704a1 1 0 0 0 1.414 1.415l0.704 -0.705 0.705 0.705a1 1 0 0 0 1.414 -1.415l-0.704 -0.704 0.704 -0.704Zm-9.093 0.704c0 -0.796 0.64 -1.436 1.436 -1.436 0.796 0 1.436 0.64 1.436 1.436 0 0.796 -0.64 1.436 -1.436 1.436 -0.796 0 -1.436 -0.64 -1.436 -1.436Zm0 5.547c0 -0.796 0.64 -1.436 1.436 -1.436 0.796 0 1.436 0.64 1.436 1.436 0 0.796 -0.64 1.436 -1.436 1.436 -0.796 0 -1.436 -0.64 -1.436 -1.436Zm5.538 0c0 -0.796 0.64 -1.436 1.436 -1.436 0.796 0 1.436 0.64 1.436 1.436 0 0.796 -0.64 1.436 -1.436 1.436 -0.796 0 -1.436 -0.64 -1.436 -1.436Zm-11.076 0c0 -0.796 0.64 -1.436 1.436 -1.436 0.796 0 1.436 0.64 1.436 1.436 0 0.796 -0.64 1.436 -1.436 1.436 -0.796 0 -1.436 -0.64 -1.436 -1.436Zm-0.023 -5.523c0 -0.796 0.64 -1.436 1.436 -1.436 0.796 0 1.436 0.64 1.436 1.436 0 0.796 -0.64 1.436 -1.436 1.436 -0.796 0 -1.436 -0.64 -1.436 -1.436Z" />
  </Svg>
);

const CalendarAddIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M9.57 16.5H2.5A0.5 0.5 0 0 1 2 16V7.5a0.5 0.5 0 0 1 0.5 -0.5H16a0.5 0.5 0 0 1 0.5 0.5v2.07a7.18 7.18 0 0 1 2 0V3a1 1 0 0 0 -1 -1H15a0.25 0.25 0 0 1 -0.25 -0.25v-1a0.75 0.75 0 0 0 -1.5 0V4.5a0.75 0.75 0 0 1 -1.5 0v-2a0.5 0.5 0 0 0 -0.5 -0.5H7a0.25 0.25 0 0 1 -0.25 -0.25v-1a0.75 0.75 0 0 0 -1.5 0V4.5a0.75 0.75 0 0 1 -1.5 0v-2a0.5 0.5 0 0 0 -0.5 -0.5H1a1 1 0 0 0 -1 1v13.5a2 2 0 0 0 2 2h7.57a7.18 7.18 0 0 1 0 -2Z" />
    <Path d="M17.5 11a6.5 6.5 0 1 0 6.5 6.5 6.51 6.51 0 0 0 -6.5 -6.5Zm0.75 9a0.75 0.75 0 0 1 -1.5 0v-1.5a0.25 0.25 0 0 0 -0.25 -0.25H15a0.75 0.75 0 0 1 0 -1.5h1.5a0.25 0.25 0 0 0 0.25 -0.25V15a0.75 0.75 0 0 1 1.5 0v1.5a0.25 0.25 0 0 0 0.25 0.25H20a0.75 0.75 0 0 1 0 1.5h-1.5a0.25 0.25 0 0 0 -0.25 0.25Z" />
  </Svg>
);

const AlarmClockIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M9.93 15h-0.72l1.48 -1.69a1 1 0 0 0 -0.76 -1.66H7a1 1 0 1 0 0 2h0.73l-1.48 1.69A1 1 0 0 0 7 17h2.93a1 1 0 0 0 0 -2Z" />
    <Path d="M16 10.4h-1.49l2.26 -2.77A1 1 0 0 0 16 6h-3.6a1 1 0 1 0 0 2h1.49l-2.26 2.77a1 1 0 0 0 -0.13 1.06 1 1 0 0 0 0.9 0.57H16a1 1 0 0 0 0 -2Z" />
    <Path d="M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0Zm8.68 12.75H22a9.88 9.88 0 0 1 -2.39 5.76l-0.9 -0.9a0.75 0.75 0 0 0 -1.06 1.06l0.9 0.9a9.88 9.88 0 0 1 -5.8 2.43v-1.32a0.75 0.75 0 0 0 -1.5 0V22a9.88 9.88 0 0 1 -5.76 -2.39l0.9 -0.9a0.75 0.75 0 0 0 -1.06 -1.06l-0.9 0.9A9.88 9.88 0 0 1 2 12.75h1.32a0.75 0.75 0 1 0 0 -1.5H2a9.88 9.88 0 0 1 2.43 -5.76l0.9 0.9a0.75 0.75 0 0 0 1.06 0 0.75 0.75 0 0 0 0 -1.06l-0.9 -0.9A9.88 9.88 0 0 1 11.25 2v1.32a0.75 0.75 0 0 0 1.5 0V2a9.88 9.88 0 0 1 5.76 2.39l-0.9 0.9a0.75 0.75 0 0 0 0 1.06 0.75 0.75 0 0 0 1.06 0l0.9 -0.9a9.88 9.88 0 0 1 2.43 5.8h-1.32a0.75 0.75 0 0 0 0 1.5Z" />
  </Svg>
);

const LinkBrokenIcon = ({ size = iconSize.toggleRow, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 0.5A4.51 4.51 0 0 0 7.5 5v3.13a1 1 0 1 0 2 0V5a2.5 2.5 0 0 1 5 0v5.5A2.5 2.5 0 0 1 12 13a1 1 0 0 0 0 2 4.51 4.51 0 0 0 4.5 -4.5V5A4.51 4.51 0 0 0 12 0.5Z" />
    <Path d="M15.5 15.63a1 1 0 0 0 -1 1V19a2.5 2.5 0 0 1 -5 0v-5a2.5 2.5 0 0 1 2.5 -2.5 1 1 0 0 0 0 -2A4.51 4.51 0 0 0 7.5 14v5a4.5 4.5 0 0 0 9 0v-2.37a1 1 0 0 0 -1 -1Z" />
    <Path d="m5.24 6.88 -1.3 -0.75a1 1 0 1 0 -1 1.74l1.3 0.75a1 1 0 0 0 1.36 -0.37 1 1 0 0 0 -0.36 -1.37Z" />
    <Path d="M4 12.5a1 1 0 0 0 0 -2H2.5a1 1 0 0 0 0 2Z" />
    <Path d="m4.24 14.38 -1.3 0.75a1 1 0 0 0 1 1.74l1.3 -0.75a1 1 0 0 0 -1 -1.74Z" />
    <Path d="M19.26 8.75a1 1 0 0 0 0.5 -0.13l1.3 -0.75a1 1 0 0 0 -1 -1.74l-1.3 0.75a1 1 0 0 0 0.5 1.87Z" />
    <Path d="M21.5 10.5H20a1 1 0 0 0 0 2h1.5a1 1 0 0 0 0 -2Z" />
    <Path d="m21.06 15.13 -1.3 -0.75a1 1 0 0 0 -1 1.74l1.3 0.75a1 1 0 1 0 1 -1.74Z" />
  </Svg>
);

const Calendar3Icon = ({ size = iconSize.toggleRow, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M7.5 10.5h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0 -2Z" />
    <Path d="M12.5 10.5h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0 -2Z" />
    <Path d="M17.5 10.5h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0 -2Z" />
    <Path d="M7.5 14.5h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0 -2Z" />
    <Path d="M12.5 14.5h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0 -2Z" />
    <Path d="M17.5 14.5h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0 -2Z" />
    <Path d="M7.5 18.5h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0 -2Z" />
    <Path d="M12.5 18.5h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0 -2Z" />
    <Path d="M17.5 18.5h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0 -2Z" />
    <Path d="M21.5 3h-2.75a0.25 0.25 0 0 1 -0.25 -0.25V1a1 1 0 0 0 -2 0v4.75a0.75 0.75 0 0 1 -1.5 0V3.5a0.5 0.5 0 0 0 -0.5 -0.5H8.25A0.25 0.25 0 0 1 8 2.75V1a1 1 0 0 0 -2 0v4.75a0.75 0.75 0 0 1 -1.5 0V3.5A0.5 0.5 0 0 0 4 3H2.5a2 2 0 0 0 -2 2v17a2 2 0 0 0 2 2h19a2 2 0 0 0 2 -2V5a2 2 0 0 0 -2 -2Zm0 18.5a0.5 0.5 0 0 1 -0.5 0.5H3a0.5 0.5 0 0 1 -0.5 -0.5v-12A0.5 0.5 0 0 1 3 9h18a0.5 0.5 0 0 1 0.5 0.5Z" />
  </Svg>
);

const SkullIcon = ({ size = iconSize.toggleRow, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 0.5a10 10 0 0 0 -10 10V13a5.49 5.49 0 0 0 3.2 5 2 2 0 0 1 1 2.48c-0.64 1.82 -0.91 2.17 -0.43 2.7a1 1 0 0 0 0.74 0.33h2A0.5 0.5 0 0 0 9 23v-2a1 1 0 0 1 2 0v2a0.5 0.5 0 0 0 0.5 0.5h1a0.5 0.5 0 0 0 0.5 -0.5v-2a1 1 0 0 1 2 0v2a0.5 0.5 0 0 0 0.5 0.5h1.95a1 1 0 0 0 0.74 -0.33c0.48 -0.53 0.22 -0.87 -0.43 -2.7a2 2 0 0 1 1 -2.48A5.49 5.49 0 0 0 22 13v-2.5a10 10 0 0 0 -10 -10Zm-4.5 14A2.5 2.5 0 1 1 10 12a2.5 2.5 0 0 1 -2.5 2.51Zm5.68 2.76a0.51 0.51 0 0 1 -0.43 0.24h-1.5a0.49 0.49 0 0 1 -0.42 -0.24 0.5 0.5 0 0 1 0 -0.49l0.75 -1.5a0.52 0.52 0 0 1 0.9 0l0.75 1.5a0.5 0.5 0 0 1 -0.05 0.5Zm3.32 -2.76A2.5 2.5 0 1 1 19 12a2.5 2.5 0 0 1 -2.5 2.51Z" />
  </Svg>
);

const GlobeIcon = ({ size = iconSize.md, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 22c1.38 0 3.27-3.4 3.48-9H8.52c.2 5.6 2.1 9 3.48 9m0-20c-1.38 0-3.27 3.4-3.48 9h6.96c-.2-5.6-2.1-9-3.48-9m3.53.65c1.17 2.12 1.83 5.22 1.95 8.35h4.47c-.38-3.83-2.94-7.03-6.42-8.35m0 18.7c3.48-1.32 6.04-4.51 6.42-8.35h-4.47c-.12 3.12-.78 6.23-1.95 8.35M2.05 13c.38 3.83 2.94 7.03 6.42 8.35C7.3 19.23 6.64 16.13 6.52 13zm0-2h4.47c.12-3.12.78-6.23 1.95-8.35C4.99 3.97 2.43 7.16 2.05 11" />
  </Svg>
);

const RotateCwIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M2.5 16.5A0.5 0.5 0 0 1 2 16V7.5a0.5 0.5 0 0 1 0.5 -0.5H16a0.5 0.5 0 0 1 0.5 0.5v2.07a7.18 7.18 0 0 1 2 0V3a1 1 0 0 0 -1 -1H15a0.25 0.25 0 0 1 -0.25 -0.25v-1a0.75 0.75 0 0 0 -1.5 0V4.5a0.75 0.75 0 0 1 -1.5 0v-2a0.5 0.5 0 0 0 -0.5 -0.5H7a0.25 0.25 0 0 1 -0.25 -0.25v-1a0.75 0.75 0 0 0 -1.5 0V4.5a0.75 0.75 0 0 1 -1.5 0v-2a0.5 0.5 0 0 0 -0.5 -0.5H1a1 1 0 0 0 -1 1v13.5a2 2 0 0 0 2 2h7.57a7.18 7.18 0 0 1 0 -2Z" />
    <Path d="M22.77 18.6a1 1 0 0 0 -1.27 0.62 4.09 4.09 0 0 1 -7.07 1.24l1.88 -1.88a0.5 0.5 0 0 0 -0.35 -0.86H11.5a0.5 0.5 0 0 0 -0.5 0.5v4.46a0.5 0.5 0 0 0 0.31 0.46 0.47 0.47 0 0 0 0.54 -0.11L13 21.88a6.09 6.09 0 0 0 10.38 -2 1 1 0 0 0 -0.61 -1.28Z" />
    <Path d="M23.69 11.77a0.51 0.51 0 0 0 -0.54 0.11l-1.21 1.21a6.1 6.1 0 0 0 -10.37 2 1 1 0 1 0 1.89 0.65 4.09 4.09 0 0 1 7.05 -1.27l-1.82 1.83a0.5 0.5 0 0 0 0.35 0.85h4.46a0.5 0.5 0 0 0 0.5 -0.5v-4.41a0.5 0.5 0 0 0 -0.31 -0.47Z" />
  </Svg>
);

const SendIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M23.61 0.23a1.05 1.05 0 0 0 -1.14 -0.11L0.83 11.65A1.54 1.54 0 0 0 1 14.44l3.26 1.38a0.69 0.69 0 0 0 0 0.25l2.5 6.74a1.82 1.82 0 0 0 2.93 0.72l3.4 -3.76a0.26 0.26 0 0 1 0.29 -0.06l3.15 1.34a1.63 1.63 0 0 0 1.3 0 1.53 1.53 0 0 0 0.83 -1L24 1.3a1 1 0 0 0 -0.39 -1.07ZM5.84 16.05 15.53 8a0.23 0.23 0 0 1 0.34 0 0.22 0.22 0 0 1 0 0.33l-7.22 8.86a0.75 0.75 0 0 0 -0.16 0.35l-0.63 3.95Z" />
  </Svg>
);

// ============ Time Preset Circles ============
const TIME_PRESETS = [
  { label: '00:00:01', seconds: 1 },
  { label: '00:00:15', seconds: 15 },
  { label: '00:00:30', seconds: 30 },
  { label: '00:01:00', seconds: 60 },
  { label: '00:05:00', seconds: 300 },
  { label: '00:10:00', seconds: 600 },
  { label: '00:15:00', seconds: 900 },
  { label: '00:30:00', seconds: 1800 },
  { label: '01:00:00', seconds: 3600 },
  { label: '02:00:00', seconds: 7200 },
  { label: '04:00:00', seconds: 14400 },
  { label: '08:00:00', seconds: 28800 },
  { label: '12:00:00', seconds: 43200 },
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const totalToSeconds = (d: number, h: number, m: number, sec: number) => d * 86400 + h * 3600 + m * 60 + sec;
const secondsToTimer = (total: number) => {
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return { d, h, m, sec };
};

const LONG_PRESS_INITIAL_DELAY = 400;
const LONG_PRESS_START_INTERVAL = 300;
const LONG_PRESS_MIN_INTERVAL = 50;
const LONG_PRESS_ACCELERATION = 0.85;

const TimePresetCircle = memo(({ label, onPress, onLongPressAdd }: {
  label: string;
  onPress: () => void;
  onLongPressAdd: () => void;
}) => {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const repeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLongPressAddRef = useRef(onLongPressAdd);
  onLongPressAddRef.current = onLongPressAdd;
  const didLongPress = useRef(false);
  const activeRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const { flashOpacity, onPressIn: flashIn, onPressOut: flashOut } = useFlashPress();

  const clearTimers = useCallback(() => {
    activeRef.current = false;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (repeatRef.current) { clearTimeout(repeatRef.current); repeatRef.current = null; }
  }, []);

  const scheduleNext = useCallback((interval: number) => {
    if (!activeRef.current) return;
    repeatRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      if (haptics.bubbleButton.enabled) {
        triggerHaptic(haptics.bubbleButton.type);
      }
      onLongPressAddRef.current();
      scheduleNext(Math.max(LONG_PRESS_MIN_INTERVAL, interval * LONG_PRESS_ACCELERATION));
    }, interval);
  }, []);

  const handlePressIn = useCallback(() => {
    clearTimers();
    didLongPress.current = false;
    activeRef.current = true;
    flashIn();
    Animated.timing(scaleAnim, { toValue: 0.9, useNativeDriver: true, duration: 30 }).start();
    Animated.timing(borderAnim, { toValue: 1, useNativeDriver: false, duration: 30 }).start();
    timeoutRef.current = setTimeout(() => {
      didLongPress.current = true;
      if (haptics.bubbleButton.enabled) {
        triggerHaptic(haptics.bubbleButton.type);
      }
      onLongPressAddRef.current();
      scheduleNext(LONG_PRESS_START_INTERVAL);
    }, LONG_PRESS_INITIAL_DELAY);
  }, [clearTimers, scheduleNext, scaleAnim, borderAnim, flashIn]);

  const handlePressOut = useCallback(() => {
    clearTimers();
    flashOut();
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start();
    Animated.timing(borderAnim, { toValue: 0, useNativeDriver: false, duration: 200 }).start();
  }, [clearTimers, scaleAnim, borderAnim, flashOut]);

  const handlePress = useCallback(() => {
    if (!didLongPress.current) {
      if (haptics.bubbleButton.enabled) {
        triggerHaptic(haptics.bubbleButton.type);
      }
      onPress();
    }
  }, [onPress]);

  useEffect(() => clearTimers, [clearTimers]);

  const circleSize = s(90);

  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, '#FFFFFF'],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Animated.View
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: animatedBorderColor,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', opacity: flashOpacity }} pointerEvents="none" />
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ color: colors.text, fontSize: s(12) }}
            className={fontFamily.semibold}
          >
            {label}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

// ============ Recurrence Wheel Picker Component ============
const RECURRENCE_ITEM_HEIGHT = 40;
const RECURRENCE_VISIBLE_ITEMS = 3;
const RECURRENCE_WINDOW_BUFFER = 5;
const RECURRENCE_VALUES = Array.from({ length: 99 }, (_, i) => i + 1);
const RECURRENCE_UNITS: RecurringUnit[] = ['minutes', 'hours', 'days', 'weeks', 'months'];

interface RecurrenceWheelProps {
  values: (number | string)[];
  selectedValue: number | string;
  onValueChange: (value: number | string) => void;
  textColor: string;
  textMutedColor: string;
  itemHeight: number;
  wheelWidth: number;
  selectedFontSize: number;
  unselectedFontSize: number;
  formatValue?: (value: number | string) => string;
  parentScrollRef?: React.RefObject<ScrollView | null>;
}

const RecurrenceWheel = memo(({ values, selectedValue, onValueChange, textColor, textMutedColor, itemHeight, wheelWidth, selectedFontSize, unselectedFontSize, formatValue, parentScrollRef }: RecurrenceWheelProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const scrolledByUser = useRef(false);
  const lastTickIndex = useRef(values.indexOf(selectedValue));

  const selectedIndex = values.indexOf(selectedValue);
  const [windowStart, setWindowStart] = useState(() => Math.max(0, selectedIndex - RECURRENCE_WINDOW_BUFFER));
  const [windowEnd, setWindowEnd] = useState(() => Math.min(values.length - 1, selectedIndex + RECURRENCE_WINDOW_BUFFER));

  const windowedValues = useMemo(() => values.slice(windowStart, windowEnd + 1), [values, windowStart, windowEnd]);
  const topSpacerHeight = windowStart * itemHeight;
  const bottomSpacerHeight = (values.length - 1 - windowEnd) * itemHeight;

  useEffect(() => {
    if (scrolledByUser.current) {
      scrolledByUser.current = false;
      return;
    }
    const index = values.indexOf(selectedValue);
    if (index >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: index * itemHeight, animated: false });
    }
  }, [selectedValue, values, itemHeight]);

  const updateWindow = useCallback((centerIndex: number) => {
    const newStart = Math.max(0, centerIndex - RECURRENCE_WINDOW_BUFFER);
    const newEnd = Math.min(values.length - 1, centerIndex + RECURRENCE_WINDOW_BUFFER);
    setWindowStart(prev => prev !== newStart ? newStart : prev);
    setWindowEnd(prev => prev !== newEnd ? newEnd : prev);
  }, [values.length]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const currentIndex = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(currentIndex, values.length - 1));

    if (clampedIndex !== lastTickIndex.current) {
      if (haptics.timeWheel.enabled) {
        const steps = Math.abs(clampedIndex - lastTickIndex.current);
        for (let i = 0; i < steps; i++) {
          triggerHaptic(haptics.timeWheel.type);
        }
      }
      lastTickIndex.current = clampedIndex;
    }

    updateWindow(clampedIndex);
  }, [values.length, itemHeight, updateWindow]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));

    if (values[clampedIndex] !== selectedValue) {
      scrolledByUser.current = true;
      onValueChange(values[clampedIndex]);
    }
  }, [values, selectedValue, onValueChange, itemHeight]);

  const paddingVertical = (itemHeight * (RECURRENCE_VISIBLE_ITEMS - 1)) / 2;

  return (
    <View
      style={{ alignItems: 'center' }}
      onTouchStart={parentScrollRef ? () => parentScrollRef.current?.setNativeProps({ scrollEnabled: false }) : undefined}
      onTouchEnd={parentScrollRef ? () => parentScrollRef.current?.setNativeProps({ scrollEnabled: true }) : undefined}
      onTouchCancel={parentScrollRef ? () => parentScrollRef.current?.setNativeProps({ scrollEnabled: true }) : undefined}
    >
      <View style={{ height: itemHeight * RECURRENCE_VISIBLE_ITEMS, width: wheelWidth, overflow: 'hidden' }}>
        <ScrollView
          ref={scrollRef}
          contentOffset={{ x: 0, y: selectedIndex * itemHeight }}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={(e) => {
            if (e.nativeEvent.velocity?.y === 0) handleScrollEnd(e);
          }}
          contentContainerStyle={{ paddingVertical }}
          nestedScrollEnabled={false}
          overScrollMode="never"
        >
          {topSpacerHeight > 0 && <View style={{ height: topSpacerHeight }} />}
          {windowedValues.map((value) => {
            const isSelected = value === selectedValue;
            const displayValue = formatValue ? formatValue(value) : String(value);
            return (
              <View key={String(value)} style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: isSelected ? selectedFontSize : unselectedFontSize,
                    color: isSelected ? textColor : textMutedColor,
                  }}
                  className={isSelected ? fontFamily.bold : fontFamily.regular}
                >
                  {displayValue}
                </Text>
              </View>
            );
          })}
          {bottomSpacerHeight > 0 && <View style={{ height: bottomSpacerHeight }} />}
        </ScrollView>
      </View>
    </View>
  );
});

interface RecurrenceWheelPickerProps {
  value: number;
  unit: RecurringUnit;
  onValueChange: (value: number) => void;
  onUnitChange: (unit: RecurringUnit) => void;
  parentScrollRef?: React.RefObject<ScrollView | null>;
}

const RecurrenceWheelPicker = memo(({ value, unit, onValueChange, onUnitChange, parentScrollRef }: RecurrenceWheelPickerProps) => {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const itemHeight = s(RECURRENCE_ITEM_HEIGHT);
  const numberWheelWidth = s(50);
  const unitWheelWidth = s(115);
  const textMutedColor = colors.text === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(26,26,26,0.3)';
  const selectedFontSize = s(24);
  const unselectedFontSize = s(18);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: s(16) }}>
      <RecurrenceWheel
        values={RECURRENCE_VALUES}
        selectedValue={value}
        onValueChange={(val) => onValueChange(val as number)}
        textColor={colors.text}
        textMutedColor={textMutedColor}
        itemHeight={itemHeight}
        wheelWidth={numberWheelWidth}
        selectedFontSize={selectedFontSize}
        unselectedFontSize={unselectedFontSize}
        formatValue={(v) => String(v).padStart(2, '0')}
        parentScrollRef={parentScrollRef}
      />
      <RecurrenceWheel
        values={RECURRENCE_UNITS}
        selectedValue={unit}
        onValueChange={(val) => onUnitChange(val as RecurringUnit)}
        textColor={colors.text}
        textMutedColor={textMutedColor}
        itemHeight={itemHeight}
        wheelWidth={unitWheelWidth}
        selectedFontSize={selectedFontSize}
        unselectedFontSize={unselectedFontSize}
        parentScrollRef={parentScrollRef}
      />
    </View>
  );
});

// ============ ExpandableInfo Component ============
const ExpandableInfo = ({ expanded, children, lazy = false }: { expanded: boolean; children: React.ReactNode; lazy?: boolean }) => {
  if (lazy && !expanded) return null;
  if (!expanded) return null;
  return (
    <View>
      {children}
    </View>
  );
};

// ============ AnimatedInfoExpand Component ============
const AnimatedInfoExpand = ({ expanded, children }: { expanded: boolean; children: React.ReactNode }) => {
  const anim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const measured = useRef(false);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [expanded, anim]);

  return (
    <Animated.View
      style={{
        height: contentHeight > 0
          ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight] })
          : expanded ? undefined : 0,
        opacity: anim,
        overflow: 'hidden',
      }}
    >
      <View
        onLayout={(e) => {
          if (!measured.current) {
            measured.current = true;
            setContentHeight(e.nativeEvent.layout.height);
          }
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
};

// ============ InfoIcon Component ============
const InfoIcon = ({ expanded, color, size }: { expanded: boolean; color: string; size: number }) => (
  <PhosphorInfoIcon size={size} color={color} weight={expanded ? 'fill' : 'regular'} />
);

// ============ Navigation Types ============
type PresetSettingsNavigationProp = BottomTabNavigationProp<MainTabParamList, 'PresetSettings'>;

// ============ Main Screen Component ============
function PresetSettingsScreen() {
  const navigation = useNavigation<PresetSettingsNavigationProp>();
  const { onSave, getEditingPreset, getExistingPresets, getEmail, getPresetSettingsParams, setPresetSettingsParams, getFinalSettingsState, setFinalSettingsState, setDatePickerParams, setDatePickerResult, getDatePickerResult } = usePresetSave();
  const paramsSnapshot = getPresetSettingsParams();
  const name = paramsSnapshot?.name ?? '';
  const selectedApps = paramsSnapshot?.selectedApps ?? [];
  const blockedWebsites = paramsSnapshot?.blockedWebsites ?? [];
  const installedApps = paramsSnapshot?.installedApps ?? [];
  const iosSelectedAppsCount = paramsSnapshot?.iosSelectedAppsCount ?? 0;
  const { tapoutStatus, userEmail } = useAuth();
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();

  // ============ Toggle/Timer/Schedule State ============
  const [blockSettings, setBlockSettings] = useState(false);
  const [noTimeLimit, setNoTimeLimit] = useState(false);
  const [timerDays, setTimerDays] = useState(0);
  const [timerHours, setTimerHours] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const hasSaved = useRef(false);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [dateEnabled, setDateEnabled] = useState(false);

  // Emergency tapout feature
  const tapoutHeartBeat = useRef(new Animated.Value(1)).current;

  const tapoutsRemaining = tapoutStatus?.remaining ?? 0;

  useEffect(() => {
    if (tapoutsRemaining === 0) {
      tapoutHeartBeat.setValue(1);
      return;
    }
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(tapoutHeartBeat, { toValue: 1.15, duration: 90, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(tapoutHeartBeat, { toValue: 1, duration: 80, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(60),
        Animated.timing(tapoutHeartBeat, { toValue: 1.1, duration: 80, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(tapoutHeartBeat, { toValue: 1, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(700),
      ])
    );
    beat.start();
    return () => beat.stop();
  }, [tapoutHeartBeat, tapoutsRemaining]);

  const [allowEmergencyTapout, setAllowEmergencyTapout] = useState(false);
  const [noTapoutsModalVisible, setNoTapoutsModalVisible] = useState(false);

  // Duplicate name modal
  const [duplicateNameModalVisible, setDuplicateNameModalVisible] = useState(false);

  // Disable tapout warning modal
  const [disableTapoutWarningVisible, setDisableTapoutWarningVisible] = useState(false);

  // Block settings warning modal
  const [blockSettingsWarningVisible, setBlockSettingsWarningVisible] = useState(false);

  // Strict mode feature
  const [strictMode, setStrictMode] = useState(false);
  const [strictModeWarningVisible, setStrictModeWarningVisible] = useState(false);

  // Custom overlay
  const [customOverlayEnabled, setCustomOverlayEnabled] = useState(false);
  const [customBlockedText, setCustomBlockedText] = useState('');
  const [customOverlayImage, setCustomOverlayImage] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  // Custom redirect URL (where browser goes when blocked website detected)
  const [customRedirectEnabled, setCustomRedirectEnabled] = useState(false);
  const [customRedirectUrl, setCustomRedirectUrl] = useState('');

  // Section collapse state (all expanded by default)

  // Expandable info dropdowns
  const [expandedInfo, setExpandedInfo] = useState<Record<string, boolean>>({});
  const toggleInfo = useCallback((key: string) => {
    setExpandedInfo(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Scheduling feature
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState<Date | null>(null);
  const [scheduleEndDate, setScheduleEndDate] = useState<Date | null>(null);

  // Recurring schedule feature
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringValue, setRecurringValue] = useState<string>('1');
  const [recurringUnit, setRecurringUnit] = useState<RecurringUnit>('hours');
  const [svgKey, setSvgKey] = useState(0);
  const [skipSwitchAnimation, setSkipSwitchAnimation] = useState(false);

  // Refs
  const mainScrollRef = useRef<ScrollView>(null);

  // Refs to track current form state for saving on blur
  const blockSettingsRef = useRef(blockSettings);
  const noTimeLimitRef = useRef(noTimeLimit);
  const timerDaysRef = useRef(timerDays);
  const timerHoursRef = useRef(timerHours);
  const timerMinutesRef = useRef(timerMinutes);
  const timerSecondsRef = useRef(timerSeconds);
  const timerEnabledRef = useRef(timerEnabled);
  const targetDateRef = useRef(targetDate);
  const dateEnabledRef = useRef(dateEnabled);
  const allowEmergencyTapoutRef = useRef(allowEmergencyTapout);
  const strictModeRef = useRef(strictMode);
  const isScheduledRef = useRef(isScheduled);
  const scheduleStartDateRef = useRef(scheduleStartDate);
  const scheduleEndDateRef = useRef(scheduleEndDate);
  const isRecurringRef = useRef(isRecurring);
  const recurringValueRef = useRef(recurringValue);
  const recurringUnitRef = useRef(recurringUnit);
  const customOverlayEnabledRef = useRef(customOverlayEnabled);
  const customBlockedTextRef = useRef(customBlockedText);
  const customOverlayImageRef = useRef(customOverlayImage);
  const customRedirectEnabledRef = useRef(customRedirectEnabled);
  const customRedirectUrlRef = useRef(customRedirectUrl);

  // Keep refs in sync with state
  blockSettingsRef.current = blockSettings;
  noTimeLimitRef.current = noTimeLimit;
  timerDaysRef.current = timerDays;
  timerHoursRef.current = timerHours;
  timerMinutesRef.current = timerMinutes;
  timerSecondsRef.current = timerSeconds;
  timerEnabledRef.current = timerEnabled;
  targetDateRef.current = targetDate;
  dateEnabledRef.current = dateEnabled;
  allowEmergencyTapoutRef.current = allowEmergencyTapout;
  strictModeRef.current = strictMode;
  isScheduledRef.current = isScheduled;
  scheduleStartDateRef.current = scheduleStartDate;
  scheduleEndDateRef.current = scheduleEndDate;
  isRecurringRef.current = isRecurring;
  recurringValueRef.current = recurringValue;
  recurringUnitRef.current = recurringUnit;
  customOverlayEnabledRef.current = customOverlayEnabled;
  customRedirectEnabledRef.current = customRedirectEnabled;
  customRedirectUrlRef.current = customRedirectUrl;
  customBlockedTextRef.current = customBlockedText;
  customOverlayImageRef.current = customOverlayImage;

  // ============ Reinitialize from editingPreset each time screen gains focus ============
  // Restores from saved finalSettingsState if returning from EditPresetApps (back-and-forward),
  // otherwise initializes from editingPreset or defaults.
  useFocusEffect(
    useCallback(() => {
      setSvgKey(k => k + 1);
      const savedState = getFinalSettingsState();
      if (savedState) {
        // Returning from EditPresetApps — restore the form state the user already configured
        setBlockSettings(savedState.blockSettings);
        setNoTimeLimit(savedState.noTimeLimit);
        setTimerDays(savedState.timerDays);
        setTimerHours(savedState.timerHours);
        setTimerMinutes(savedState.timerMinutes);
        setTimerSeconds(savedState.timerSeconds);
        setTimerEnabled(savedState.timerEnabled ?? (savedState.timerDays > 0 || savedState.timerHours > 0 || savedState.timerMinutes > 0 || savedState.timerSeconds > 0));
        setTargetDate(savedState.targetDate ? new Date(savedState.targetDate) : null);
        setDateEnabled(savedState.dateEnabled ?? !!savedState.targetDate);
        setAllowEmergencyTapout(savedState.allowEmergencyTapout);
        setStrictMode(savedState.strictMode);
        setIsScheduled(savedState.isScheduled);
        setScheduleStartDate(savedState.scheduleStartDate ? new Date(savedState.scheduleStartDate) : null);
        setScheduleEndDate(savedState.scheduleEndDate ? new Date(savedState.scheduleEndDate) : null);
        setIsRecurring(savedState.isRecurring);
        setRecurringValue(savedState.recurringValue);
        setRecurringUnit(savedState.recurringUnit);
        setCustomBlockedText(savedState.customBlockedText ?? '');
        setCustomOverlayImage(savedState.customOverlayImage ?? '');
        setCustomOverlayEnabled(!!(savedState.customBlockedText || savedState.customOverlayImage));
        setCustomRedirectUrl(savedState.customRedirectUrl ?? '');
        setCustomRedirectEnabled(!!savedState.customRedirectUrl);
        console.log('[OVERLAY] Restored from savedState — text:', savedState.customBlockedText, 'image:', savedState.customOverlayImage);
      } else {
        const editingPreset = getEditingPreset();
        if (editingPreset) {
          setBlockSettings(editingPreset.blockSettings);
          setNoTimeLimit(editingPreset.noTimeLimit);
          setTimerDays(editingPreset.timerDays);
          setTimerHours(editingPreset.timerHours);
          setTimerMinutes(editingPreset.timerMinutes);
          setTimerSeconds(editingPreset.timerSeconds ?? 0);
          setTimerEnabled(editingPreset.timerDays > 0 || editingPreset.timerHours > 0 || editingPreset.timerMinutes > 0 || (editingPreset.timerSeconds ?? 0) > 0);
          setTargetDate(editingPreset.targetDate ? new Date(editingPreset.targetDate) : null);
          setDateEnabled(!!editingPreset.targetDate);
          setAllowEmergencyTapout(editingPreset.allowEmergencyTapout ?? false);
          setStrictMode(editingPreset.strictMode ?? false);
          setIsScheduled(editingPreset.isScheduled ?? false);
          setScheduleStartDate(editingPreset.scheduleStartDate ? new Date(editingPreset.scheduleStartDate) : null);
          setScheduleEndDate(editingPreset.scheduleEndDate ? new Date(editingPreset.scheduleEndDate) : null);
          setIsRecurring(editingPreset.repeat_enabled ?? false);
          setRecurringValue(editingPreset.repeat_interval?.toString() ?? '1');
          setRecurringUnit(editingPreset.repeat_unit ?? 'hours');
          setCustomBlockedText(editingPreset.customBlockedText ?? '');
          setCustomOverlayImage(editingPreset.customOverlayImage ?? '');
          setCustomOverlayEnabled(!!(editingPreset.customBlockedText || editingPreset.customOverlayImage));
          setCustomRedirectUrl(editingPreset.customRedirectUrl ?? '');
          setCustomRedirectEnabled(!!editingPreset.customRedirectUrl);
          console.log('[OVERLAY] Restored from editingPreset — text:', editingPreset.customBlockedText, 'image:', editingPreset.customOverlayImage);
        } else {
          // New preset defaults
          setBlockSettings(false);
          setNoTimeLimit(false);
          setTimerDays(0);
          setTimerHours(0);
          setTimerMinutes(0);
          setTimerSeconds(0);
          setTimerEnabled(false);
          setTargetDate(null);
          setDateEnabled(false);
          setAllowEmergencyTapout(true); // Enabled by default for safety
          setStrictMode(false);
          setIsScheduled(false);
          setScheduleStartDate(null);
          setScheduleEndDate(null);
          setIsRecurring(false);
          setRecurringValue('1');
          setRecurringUnit('hours');
          setCustomBlockedText('');
          setCustomOverlayImage('');
          setCustomOverlayEnabled(false);
          setCustomRedirectUrl('');
          setCustomRedirectEnabled(false);
          console.log('[OVERLAY] New preset — defaults cleared');
        }
      }
      // Apply date picker result if returning from DatePicker screen
      const dpResult = getDatePickerResult();
      if (dpResult) {
        const finalDate = new Date(dpResult.selectedDate);
        if (dpResult.target === 'targetDate') {
          setTargetDate(finalDate);
          setTimerDays(0);
          setTimerHours(0);
          setTimerMinutes(0);
          setTimerSeconds(0);
        } else if (dpResult.target === 'scheduleStart') {
          setScheduleStartDate(finalDate);
          const currentEnd = savedState?.scheduleEndDate ? new Date(savedState.scheduleEndDate) : null;
          if (currentEnd && currentEnd <= finalDate) {
            setScheduleEndDate(null);
          }
        } else if (dpResult.target === 'scheduleEnd') {
          setScheduleEndDate(finalDate);
        }
        setDatePickerResult(null);
      }

      // Reset UI state
      hasSaved.current = false;
      setExpandedInfo({});
      setSkipSwitchAnimation(true);
      requestAnimationFrame(() => {
        setSkipSwitchAnimation(false);
      });

      // Save form state to context when screen loses focus (user taps back)
      // Skip if preset was already saved — refs were cleared by handleSave
      return () => {
        if (hasSaved.current) return;
        setFinalSettingsState({
          blockSettings: blockSettingsRef.current,
          noTimeLimit: noTimeLimitRef.current,
          timerDays: timerDaysRef.current,
          timerHours: timerHoursRef.current,
          timerMinutes: timerMinutesRef.current,
          timerSeconds: timerSecondsRef.current,
          timerEnabled: timerEnabledRef.current,
          targetDate: targetDateRef.current ? targetDateRef.current.toISOString() : null,
          dateEnabled: dateEnabledRef.current,
          allowEmergencyTapout: allowEmergencyTapoutRef.current,
          strictMode: strictModeRef.current,
          isScheduled: isScheduledRef.current,
          scheduleStartDate: scheduleStartDateRef.current ? scheduleStartDateRef.current.toISOString() : null,
          scheduleEndDate: scheduleEndDateRef.current ? scheduleEndDateRef.current.toISOString() : null,
          isRecurring: isRecurringRef.current,
          recurringValue: recurringValueRef.current,
          recurringUnit: recurringUnitRef.current,
          customBlockedText: customBlockedTextRef.current,
          customOverlayImage: customOverlayImageRef.current,
          customRedirectUrl: customRedirectUrlRef.current,
        });
      };
    }, [getEditingPreset, getFinalSettingsState, setFinalSettingsState, getDatePickerResult, setDatePickerResult])
  );

  // ============ Emergency Tapout Handler ============
  const handleEmergencyTapoutToggle = useCallback((value: boolean) => {
    if (value) {
      if ((tapoutStatus?.remaining ?? 0) <= 0) {
        setNoTapoutsModalVisible(true);
      } else {
        setAllowEmergencyTapout(true);
      }
    } else {
      AsyncStorage.getItem(DISABLE_TAPOUT_WARNING_DISMISSED_KEY).then(dismissed => {
        if (dismissed !== 'true') {
          setDisableTapoutWarningVisible(true);
        } else {
          setAllowEmergencyTapout(false);
        }
      });
    }
  }, [tapoutStatus]);

  // ============ Open Date Picker (navigates to DatePicker screen) ============
  const openDatePicker = useCallback((target: 'targetDate' | 'scheduleStart' | 'scheduleEnd') => {
    let existingDate: Date | null = null;
    if (target === 'targetDate') existingDate = targetDate;
    else if (target === 'scheduleStart') existingDate = scheduleStartDate;
    else if (target === 'scheduleEnd') existingDate = scheduleEndDate;

    setDatePickerParams({
      target,
      existingDate: existingDate ? existingDate.toISOString() : null,
      minimumDate: target === 'scheduleEnd' && scheduleStartDate
        ? scheduleStartDate.toISOString() : null,
    });
    setDatePickerResult(null);
    navigation.navigate('DatePicker');
  }, [targetDate, scheduleStartDate, scheduleEndDate, navigation, setDatePickerParams, setDatePickerResult]);

  // ============ Image Upload Handler ============
  const handleImageUpload = useCallback(async () => {
    console.log('[OVERLAY] Image picker launched');
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        maxWidth: 1080,
        maxHeight: 1080,
      });
      if (result.didCancel || !result.assets?.[0]) {
        console.log('[OVERLAY] Image picker cancelled');
        return;
      }
      const asset = result.assets[0];
      if (!asset.uri) return;

      console.log('[OVERLAY] Image selected:', asset.uri, 'type:', asset.type, 'name:', asset.fileName);
      setImageUploading(true);
      const editingPreset = getEditingPreset();
      const presetId = editingPreset?.id || 'temp_' + Date.now();
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'overlay.jpg',
      } as any);
      formData.append('presetId', presetId);

      const token = await getAuthToken();
      console.log('[OVERLAY] Uploading to', `${API_URL}/api/overlay-image`, 'hasToken:', !!token);
      const response = await fetch(`${API_URL}/api/overlay-image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      console.log('[OVERLAY] Upload response:', JSON.stringify(data));
      if (data.url) {
        const imageUrl = data.url + '?t=' + Date.now();
        console.log('[OVERLAY] Image URL set:', imageUrl);
        setCustomOverlayImage(imageUrl);
      }
    } catch (e) {
      console.warn('[OVERLAY] Image upload failed', e);
    } finally {
      setImageUploading(false);
    }
  }, [getEditingPreset]);

  // ============ Validation Logic ============
  const hasTimerValue = useMemo(() =>
    timerDays > 0 || timerHours > 0 || timerMinutes > 0 || timerSeconds > 0,
    [timerDays, timerHours, timerMinutes, timerSeconds]
  );

  const hasTargetDate = useMemo(() => targetDate !== null, [targetDate]);

  const hasValidSchedule = useMemo(() =>
    isScheduled &&
    scheduleStartDate !== null &&
    scheduleEndDate !== null &&
    scheduleEndDate > scheduleStartDate,
    [isScheduled, scheduleStartDate, scheduleEndDate]
  );

  const canSave = useMemo(() =>
    noTimeLimit || hasTimerValue || hasTargetDate || hasValidSchedule,
    [noTimeLimit, hasTimerValue, hasTargetDate, hasValidSchedule]
  );

  // Filter selectedApps to only count apps that are still installed
  const installedSelectedApps = useMemo(() => {
    const installedIds = new Set(installedApps.map((app: { id: string; name: string; icon?: string }) => app.id));
    return selectedApps.filter((id: string) => installedIds.has(id));
  }, [selectedApps, installedApps]);

  // ============ Save Handler ============
  const handleSave = useCallback(() => {
    if (!name.trim() || hasSaved.current || !canSave) return;

    const editingPreset = getEditingPreset();
    const existingPresets = getExistingPresets();

    const trimmedName = name.trim().toLowerCase();
    const duplicateExists = existingPresets.some(
      (p: Preset) => p.name.toLowerCase() === trimmedName && p.id !== editingPreset?.id
    );

    if (duplicateExists) {
      setDuplicateNameModalVisible(true);
      return;
    }

    hasSaved.current = true;

    const parsedRecurringValue = parseInt(recurringValue, 10);
    const finalRecurringInterval = isNaN(parsedRecurringValue) || parsedRecurringValue <= 0 ? 1 : parsedRecurringValue;

    const newPreset: Preset = {
      id: editingPreset?.id || '',
      name: name.trim(),
      mode: installedSelectedApps.length === 0 && blockedWebsites.length === 0 ? 'all' : 'specific',
      selectedApps: installedSelectedApps,
      blockedWebsites,
      blockSettings,
      noTimeLimit,
      timerDays: noTimeLimit || isScheduled ? 0 : timerDays,
      timerHours: noTimeLimit || isScheduled ? 0 : timerHours,
      timerMinutes: noTimeLimit || isScheduled ? 0 : timerMinutes,
      timerSeconds: noTimeLimit || isScheduled ? 0 : timerSeconds,
      targetDate: noTimeLimit || isScheduled ? null : (targetDate ? targetDate.toISOString() : null),
      isDefault: editingPreset?.isDefault ?? false,
      isActive: editingPreset?.isActive ?? false,
      allowEmergencyTapout,
      strictMode,
      isScheduled,
      scheduleStartDate: isScheduled && scheduleStartDate ? scheduleStartDate.toISOString() : null,
      scheduleEndDate: isScheduled && scheduleEndDate ? scheduleEndDate.toISOString() : null,
      repeat_enabled: isScheduled && isRecurring ? true : false,
      repeat_unit: isScheduled && isRecurring ? recurringUnit : undefined,
      repeat_interval: isScheduled && isRecurring ? finalRecurringInterval : undefined,
      customBlockedText: customOverlayEnabled && customBlockedText ? customBlockedText.trim() : undefined,
      customOverlayImage: customOverlayEnabled && customOverlayImage ? customOverlayImage : undefined,
      customRedirectUrl: customRedirectEnabled && customRedirectUrl && customRedirectUrl.trim().includes('.') ? customRedirectUrl.trim() : undefined,
    };

    console.log('[OVERLAY] Saving preset — overlayEnabled:', customOverlayEnabled, 'text:', newPreset.customBlockedText, 'image:', newPreset.customOverlayImage);
    console.log('[REDIRECT] Saving preset — redirectEnabled:', customRedirectEnabled, 'rawUrl:', customRedirectUrl, 'savedUrl:', newPreset.customRedirectUrl);

    // Navigate immediately — save happens in the background
    setFinalSettingsState(null);
    setPresetSettingsParams(null);
    navigation.navigate({ name: 'Presets' } as any);
    onSave(newPreset);
  }, [name, canSave, getEditingPreset, getExistingPresets, installedSelectedApps, blockedWebsites, blockSettings, noTimeLimit, timerDays, timerHours, timerMinutes, timerSeconds, targetDate, onSave, allowEmergencyTapout, strictMode, isScheduled, scheduleStartDate, scheduleEndDate, isRecurring, recurringValue, recurringUnit, navigation, setFinalSettingsState, customBlockedText, customOverlayImage, customOverlayEnabled, customRedirectEnabled, customRedirectUrl]);


  // ============ Render ============
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header — key forces SVG remount on focus to fix react-freeze stroke color bug */}
      <View key={svgKey} style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
        <HeaderIconButton onPress={() => navigation.navigate('EditPresetApps')} style={{ width: s(40) }}>
          <BackArrowIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
        </HeaderIconButton>
        <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>Final Settings</Text>
        <HeaderIconButton onPress={handleSave} disabled={!canSave} style={{ width: s(40) }}>
          <SaveIcon size={s(iconSize.headerNav)} color={canSave ? '#FFFFFF' : colors.textMuted} />
        </HeaderIconButton>
      </View>

      <ScrollView ref={mainScrollRef} className="flex-1" contentContainerStyle={{ paddingBottom: s(100) }}>

        {/* No Time Limit Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, paddingVertical: s(4) }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <View style={{ maxWidth: '75%' }} className="flex-row items-center">
              <View className="mr-4">
                <HourglassIcon size={s(iconSize.toggleRow)} color={colors.textSecondary} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>No Time Limit</Text>
                  <TouchableOpacity onPress={() => toggleInfo('noTimeLimit')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                    <InfoIcon expanded={!!expandedInfo.noTimeLimit} color={colors.textSecondary} size={s(16)} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Block until manually unlocked</Text>
              </View>
            </View>
            <AnimatedSwitch
              size="small"
              value={noTimeLimit}
              animate={!skipSwitchAnimation}
              onValueChange={(value: boolean) => {
                setNoTimeLimit(value);
                requestAnimationFrame(() => {
                  if (value) {
                    setTimerDays(0);
                    setTimerHours(0);
                    setTimerMinutes(0);
                    setTimerSeconds(0);
                    setTimerEnabled(false);
                    setTargetDate(null);
                    setDateEnabled(false);
                    setIsScheduled(false);
                    setScheduleStartDate(null);
                    setScheduleEndDate(null);
                    setStrictMode(false);
                    setAllowEmergencyTapout(false);
                  }
                });
              }}
            />
          </View>
          <AnimatedInfoExpand expanded={!!expandedInfo.noTimeLimit}>
            <View className="px-6 pb-4">
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                Block stays active until manually ended via home screen for No Time Limit Presets.
              </Text>
            </View>
          </AnimatedInfoExpand>

        </View>

        {/* Schedule for Later Toggle */}
        <ExpandableInfo expanded={!noTimeLimit} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, paddingVertical: s(4) }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <View style={{ maxWidth: '75%' }} className="flex-row items-center">
                <View className="mr-4">
                  <Calendar3Icon size={s(iconSize.toggleRow)} color={colors.textSecondary} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Schedule for Later</Text>
                    <TouchableOpacity onPress={() => toggleInfo('schedule')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                      <InfoIcon expanded={!!expandedInfo.schedule} color={colors.textSecondary} size={s(16)} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Set a future start and end time, with optional recurrence</Text>
                </View>
              </View>
              <AnimatedSwitch
                size="small"
                value={isScheduled}
                animate={!skipSwitchAnimation}
                onValueChange={(value: boolean) => {
                  setIsScheduled(value);
                  requestAnimationFrame(() => {
                    if (value) {
                      setNoTimeLimit(false);
                      setTimerDays(0);
                      setTimerHours(0);
                      setTimerMinutes(0);
                      setTimerSeconds(0);
                      setTimerEnabled(false);
                      setTargetDate(null);
                      setDateEnabled(false);
                      // TUTORIAL POINT: Schedule toggle enabled — show tutorial step for scheduling feature here
                    } else {
                      setScheduleStartDate(null);
                      setScheduleEndDate(null);
                    }
                  });
                }}
              />
            </View>
            <AnimatedInfoExpand expanded={!!expandedInfo.schedule}>
              <View className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Set a future start and end time. Hides timer options since duration is determined by your schedule. You can also set up recurring blocks when picking your end date.
                </Text>
              </View>
            </AnimatedInfoExpand>
            {/* Schedule Date Pickers */}
            <ExpandableInfo expanded={isScheduled}>
              <View className="px-6" style={{ paddingTop: s(8) }}>

            {/* Start Date */}
            <FlashPressable
              onPress={() => openDatePicker('scheduleStart')}
              style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard + 4), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
              className={`flex-row items-center px-5 ${radius.xl} mb-3`}
            >
                <View className="mr-4">
                  <StartDateIcon size={s(iconSize.forTabs)} color={colors.textSecondary} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>
                    {scheduleStartDate ? 'Start Date' : 'Pick Start Date'}
                  </Text>
                  {scheduleStartDate && (
                    <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                      {scheduleStartDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })} at {scheduleStartDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </Text>
                  )}
                </View>
                {scheduleStartDate && (
                  <HeaderIconButton onPress={() => setScheduleStartDate(null)}>
                    <XIcon size={s(iconSize.headerNav)} color={colors.text} />
                  </HeaderIconButton>
                )}
            </FlashPressable>

            {/* Date picker rendered as full-screen overlay */}

            {/* End Date */}
            <FlashPressable
              onPress={() => openDatePicker('scheduleEnd')}
                style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard + 4), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                className={`flex-row items-center px-5 ${radius.xl} mb-4`}
              >
                <View className="mr-4">
                  <EndDateIcon size={s(iconSize.forTabs)} color={colors.textSecondary} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>
                    {scheduleEndDate ? 'End Date' : 'Pick End Date'}
                  </Text>
                  {scheduleEndDate && (
                    <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                      {scheduleEndDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })} at {scheduleEndDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </Text>
                  )}
                </View>
                {scheduleEndDate && (
                  <HeaderIconButton onPress={() => setScheduleEndDate(null)}>
                    <XIcon size={s(iconSize.headerNav)} color={colors.text} />
                  </HeaderIconButton>
                )}
            </FlashPressable>

            {/* Date picker rendered as full-screen overlay */}

            {/* Schedule Validation Message */}
            {scheduleStartDate && scheduleEndDate && scheduleEndDate <= scheduleStartDate && (
              <Text style={{ color: colors.red }} className={`${textSize.small} ${fontFamily.regular} mt-2`}>
                End date must be after start date
              </Text>
            )}

            {/* Recurring Schedule - only when both dates are valid */}
            {scheduleStartDate && scheduleEndDate && scheduleEndDate > scheduleStartDate && (
              <View style={{ marginHorizontal: s(-24) }}>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }} />
                <View>
                  <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
                    <View style={{ maxWidth: '75%' }} className="flex-row items-center">
                      <Svg width={s(iconSize.toggleRow)} height={s(iconSize.toggleRow)} viewBox="0 0 24 24" fill="none" style={{ marginRight: s(14) }}>
                        <Path d="M2.5 16.5A0.5 0.5 0 0 1 2 16V7.5a0.5 0.5 0 0 1 0.5 -0.5H16a0.5 0.5 0 0 1 0.5 0.5v2.07a7.18 7.18 0 0 1 2 0V3a1 1 0 0 0 -1 -1H15a0.25 0.25 0 0 1 -0.25 -0.25v-1a0.75 0.75 0 0 0 -1.5 0V4.5a0.75 0.75 0 0 1 -1.5 0v-2a0.5 0.5 0 0 0 -0.5 -0.5H7a0.25 0.25 0 0 1 -0.25 -0.25v-1a0.75 0.75 0 0 0 -1.5 0V4.5a0.75 0.75 0 0 1 -1.5 0v-2a0.5 0.5 0 0 0 -0.5 -0.5H1a1 1 0 0 0 -1 1v13.5a2 2 0 0 0 2 2h7.57a7.18 7.18 0 0 1 0 -2Z" fill={colors.textSecondary} />
                        <Path d="M22.77 18.6a1 1 0 0 0 -1.27 0.62 4.09 4.09 0 0 1 -7.07 1.24l1.88 -1.88a0.5 0.5 0 0 0 -0.35 -0.86H11.5a0.5 0.5 0 0 0 -0.5 0.5v4.46a0.5 0.5 0 0 0 0.31 0.46 0.47 0.47 0 0 0 0.54 -0.11L13 21.88a6.09 6.09 0 0 0 10.38 -2 1 1 0 0 0 -0.61 -1.28Z" fill={colors.textSecondary} />
                        <Path d="M23.69 11.77a0.51 0.51 0 0 0 -0.54 0.11l-1.21 1.21a6.1 6.1 0 0 0 -10.37 2 1 1 0 1 0 1.89 0.65 4.09 4.09 0 0 1 7.05 -1.27l-1.82 1.83a0.5 0.5 0 0 0 0.35 0.85h4.46a0.5 0.5 0 0 0 0.5 -0.5v-4.41a0.5 0.5 0 0 0 -0.31 -0.47Z" fill={colors.textSecondary} />
                      </Svg>
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Recurring Schedule</Text>
                          <TouchableOpacity onPress={() => toggleInfo('recurring')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                            <InfoIcon expanded={!!expandedInfo.recurring} color={colors.textSecondary} size={s(16)} />
                          </TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Repeat this block automatically</Text>
                      </View>
                    </View>
                    <AnimatedSwitch
                      size="small"
                      value={isRecurring}
                      animate={!skipSwitchAnimation}
                      onValueChange={(value: boolean) => {
                        setIsRecurring(value);
                        // TUTORIAL POINT: Recurrence toggle enabled — show tutorial step for recurring blocks here
                      }}
                    />
                  </View>
                  <AnimatedInfoExpand expanded={!!expandedInfo.recurring}>
                    <View className="px-6 pb-4">
                      <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                        Automatically repeats this blocking session at the interval you choose. After each session ends, the next one will start based on your selected frequency.
                      </Text>
                    </View>
                  </AnimatedInfoExpand>
                  {/* Recurring Options */}
                  <ExpandableInfo expanded={isRecurring}>
                    <View
                      className="px-6 pb-4"
                      style={{ paddingTop: s(8) }}
                    >

                    {/* Wheel Picker for Recurrence */}
                    <View
                      style={{ backgroundColor: colors.card, paddingVertical: s(16), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                      className={`${radius.xl} mb-3`}
                    >
                      <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} text-center mb-3`}>
                        Repeat Every
                      </Text>
                      <RecurrenceWheelPicker
                        value={parseInt(recurringValue, 10) || 1}
                        unit={recurringUnit}
                        onValueChange={(val) => setRecurringValue(val.toString())}
                        onUnitChange={setRecurringUnit}
                        parentScrollRef={mainScrollRef}
                      />
                    </View>

                    {/* Next Occurrence Preview */}
                    {(() => {
                      if (!scheduleStartDate || !scheduleEndDate || !isRecurring) return null;

                      const parsedValue = parseInt(recurringValue, 10);
                      const value = isNaN(parsedValue) || parsedValue <= 0 ? 1 : parsedValue;
                      const duration = scheduleEndDate.getTime() - scheduleStartDate.getTime();

                      let nextStart: Date;
                      let nextEnd: Date;

                      if (recurringUnit === 'minutes' || recurringUnit === 'hours') {
                        const intervalMs = recurringUnit === 'minutes'
                          ? value * 60 * 1000
                          : value * 60 * 60 * 1000;
                        const newStartTime = scheduleEndDate.getTime() + intervalMs;
                        nextStart = new Date(newStartTime);
                        nextEnd = new Date(newStartTime + duration);
                      } else {
                        nextStart = new Date(scheduleStartDate);
                        nextEnd = new Date(scheduleEndDate);
                        if (recurringUnit === 'days') {
                          nextStart.setDate(nextStart.getDate() + value);
                          nextEnd.setDate(nextEnd.getDate() + value);
                        } else if (recurringUnit === 'weeks') {
                          nextStart.setDate(nextStart.getDate() + (value * 7));
                          nextEnd.setDate(nextEnd.getDate() + (value * 7));
                        } else if (recurringUnit === 'months') {
                          nextStart.setMonth(nextStart.getMonth() + value);
                          nextEnd.setMonth(nextEnd.getMonth() + value);
                        }
                      }

                      const isSameDay = nextStart.toDateString() === nextEnd.toDateString();

                      return (
                        <View style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard), borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`flex-row items-center px-4 ${radius.xl}`}>
                          <View className={`w-10 h-10 ${radius.lg} items-center justify-center mr-3`}>
                            <SendIcon size={s(iconSize.lg)} color={colors.textSecondary} />
                          </View>
                          <View className="flex-1">
                            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                              Next Occurrence
                            </Text>
                            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                              {`e.g. ${nextStart.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })} ${nextStart.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })} - ${isSameDay ? '' : nextEnd.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              }) + ' '}${nextEnd.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}`}
                            </Text>
                          </View>
                        </View>
                      );
                    })()}
                    </View>
                  </ExpandableInfo>
                </View>
              </View>
            )}
              </View>
            </ExpandableInfo>

          </View>
        </ExpandableInfo>

        {/* Set Timer Toggle (if time limit enabled and not scheduled) */}
        <ExpandableInfo expanded={!noTimeLimit && !isScheduled} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, paddingVertical: s(4) }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <View style={{ maxWidth: '75%' }} className="flex-row items-center">
                <View className="mr-4">
                  <AlarmClockIcon size={s(iconSize.toggleRow)} color={colors.textSecondary} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Set Fixed Time</Text>
                    <TouchableOpacity onPress={() => toggleInfo('setTimer')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                      <InfoIcon expanded={!!expandedInfo.setTimer} color={colors.textSecondary} size={s(16)} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Set a countdown duration</Text>
                </View>
              </View>
              <AnimatedSwitch
                size="small"
                value={timerEnabled}
                animate={!skipSwitchAnimation}
                onValueChange={(value: boolean) => {
                  setTimerEnabled(value);
                  if (value) {
                    setDateEnabled(false);
                    setTargetDate(null);
                  } else {
                    setTimerDays(0);
                    setTimerHours(0);
                    setTimerMinutes(0);
                    setTimerSeconds(0);
                  }
                }}
              />
            </View>
            <AnimatedInfoExpand expanded={!!expandedInfo.setTimer}>
              <View className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Set a fixed countdown timer for how long the block should last. Each bubble is formatted as HH:MM:SS (hours, minutes, seconds).
                </Text>
              </View>
            </AnimatedInfoExpand>
            {/* Time preset circles (shown when timer is enabled) */}
            <ExpandableInfo expanded={timerEnabled}>
              <View className="pb-4" style={{ paddingTop: s(8) }}>
                {/* Current total display — fixed DD:HH:MM:SS format */}
                <View style={{ position: 'relative' }} className="items-center justify-center mb-4 px-6">
                  <View className="flex-row items-end">
                    <View className="items-center">
                      <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>DD</Text>
                      <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>{pad2(timerDays)}</Text>
                    </View>
                    <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>:</Text>
                    <View className="items-center">
                      <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>HH</Text>
                      <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>{pad2(timerHours)}</Text>
                    </View>
                    <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>:</Text>
                    <View className="items-center">
                      <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>MM</Text>
                      <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>{pad2(timerMinutes)}</Text>
                    </View>
                    <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>:</Text>
                    <View className="items-center">
                      <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>SS</Text>
                      <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>{pad2(timerSeconds)}</Text>
                    </View>
                  </View>
                  <View style={{ position: 'absolute', right: s(70), opacity: (timerDays > 0 || timerHours > 0 || timerMinutes > 0 || timerSeconds > 0) ? 1 : 0 }} pointerEvents={(timerDays > 0 || timerHours > 0 || timerMinutes > 0 || timerSeconds > 0) ? 'auto' : 'none'}>
                    <HeaderIconButton onPress={() => { setTimerDays(0); setTimerHours(0); setTimerMinutes(0); setTimerSeconds(0); }}>
                      <XIcon size={s(iconSize.headerNav)} color={colors.text} />
                    </HeaderIconButton>
                  </View>
                </View>
                {/* Scrollable time presets */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: s(24), gap: s(10), paddingVertical: s(8) }}
                >
                  {TIME_PRESETS.map((preset) => (
                      <TimePresetCircle
                        key={preset.label}
                        label={preset.label}
                        onPress={() => {
                          const currentTotal = totalToSeconds(timerDaysRef.current, timerHoursRef.current, timerMinutesRef.current, timerSecondsRef.current);
                          const newTotal = currentTotal + preset.seconds;
                          const t = secondsToTimer(newTotal);
                          setTimerDays(t.d);
                          setTimerHours(t.h);
                          setTimerMinutes(t.m);
                          setTimerSeconds(t.sec);
                        }}
                        onLongPressAdd={() => {
                          const currentTotal = totalToSeconds(timerDaysRef.current, timerHoursRef.current, timerMinutesRef.current, timerSecondsRef.current);
                          const newTotal = currentTotal + preset.seconds;
                          const t = secondsToTimer(newTotal);
                          setTimerDays(t.d);
                          setTimerHours(t.h);
                          setTimerMinutes(t.m);
                          setTimerSeconds(t.sec);
                        }}
                      />
                  ))}
                </ScrollView>
              </View>
            </ExpandableInfo>
  
          </View>
        </ExpandableInfo>

        {/* Pick a Date Toggle (if time limit enabled and not scheduled) */}
        <ExpandableInfo expanded={!noTimeLimit && !isScheduled} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, paddingVertical: s(4) }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <View style={{ maxWidth: '75%' }} className="flex-row items-center">
                <View className="mr-4">
                  <PickDateIcon size={s(iconSize.toggleRow)} color={colors.textSecondary} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Pick a Date</Text>
                    <TouchableOpacity onPress={() => toggleInfo('pickDate')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                      <InfoIcon expanded={!!expandedInfo.pickDate} color={colors.textSecondary} size={s(16)} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Block until a specific date and time</Text>
                </View>
              </View>
              <AnimatedSwitch
                size="small"
                value={dateEnabled}
                animate={!skipSwitchAnimation}
                onValueChange={(value: boolean) => {
                  setDateEnabled(value);
                  if (value) {
                    setTimerEnabled(false);
                    setTimerDays(0);
                    setTimerHours(0);
                    setTimerMinutes(0);
                    setTimerSeconds(0);
                  } else {
                    setTargetDate(null);
                  }
                }}
              />
            </View>
            <AnimatedInfoExpand expanded={!!expandedInfo.pickDate}>
              <View className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Choose a specific date and time for the block to end.
                </Text>
              </View>
            </AnimatedInfoExpand>
            {/* Date picker button (shown when date is enabled) */}
            <ExpandableInfo expanded={dateEnabled}>
              <View className="px-6 pb-4">
                <FlashPressable
                  onPress={() => openDatePicker('targetDate')}
                  style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard + 4), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                  className={`flex-row items-center px-5 ${radius.xl}`}
                >
                  <View className="mr-4">
                    <CalendarAddIcon size={s(iconSize.forTabs)} color={colors.textSecondary} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>
                      {targetDate ? 'Change Date' : 'Pick a Date'}
                    </Text>
                    {targetDate && (
                      <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                        Until {targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {targetDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </Text>
                    )}
                  </View>
                  {targetDate && (
                    <HeaderIconButton onPress={() => setTargetDate(null)}>
                      <XIcon size={s(iconSize.headerNav)} color={colors.text} />
                    </HeaderIconButton>
                  )}
                </FlashPressable>
              </View>
            </ExpandableInfo>
  
          </View>
        </ExpandableInfo>

        {/* Block Settings Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, paddingVertical: s(4) }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <View style={{ maxWidth: '75%' }} className="flex-row items-center">
              <SettingsCogIcon size={s(iconSize.toggleRow)} color={colors.textSecondary} weight="fill" style={{ marginRight: s(14) }} />
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Block Settings App</Text>
                  <TouchableOpacity onPress={() => toggleInfo('blockSettings')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                    <InfoIcon expanded={!!expandedInfo.blockSettings} color={colors.textSecondary} size={s(16)} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Essential settings remain accessible</Text>
              </View>
            </View>
            <AnimatedSwitch
              size="small"
              value={blockSettings}
              animate={!skipSwitchAnimation}
              onValueChange={(value: boolean) => {
                if (value) {
                  AsyncStorage.getItem(BLOCK_SETTINGS_WARNING_DISMISSED_KEY).then(dismissed => {
                    if (dismissed !== 'true') {
                      setBlockSettingsWarningVisible(true);
                    } else {
                      setBlockSettings(true);
                    }
                  });
                } else {
                  setBlockSettings(false);
                }
              }}
            />
          </View>
          <AnimatedInfoExpand expanded={!!expandedInfo.blockSettings}>
            <View className="px-6 pb-4">
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                Prevents access to Android Settings during the block so that overlays and essential permissions cannot be disabled. Essential settings like WiFi or battery settings remain accessible via quick panel by sliding down from your phone.
              </Text>
            </View>
          </AnimatedInfoExpand>

        </View>

        {/* Strict Mode Toggle - hidden for no time limit presets */}
        <ExpandableInfo expanded={!noTimeLimit} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, paddingVertical: s(4) }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <View style={{ maxWidth: '75%' }} className="flex-row items-center">
                <View className="mr-4">
                  <SkullIcon size={s(iconSize.toggleRow)} color={colors.textSecondary} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Strict Mode</Text>
                    <TouchableOpacity onPress={() => toggleInfo('strictMode')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                      <InfoIcon expanded={!!expandedInfo.strictMode} color={colors.textSecondary} size={s(16)} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Lock until timer ends or emergency tapout</Text>
                </View>
              </View>
              <AnimatedSwitch
                size="small"
                value={strictMode}
                animate={!skipSwitchAnimation}
                onValueChange={(value: boolean) => {
                  if (value) {
                    AsyncStorage.getItem(STRICT_MODE_WARNING_DISMISSED_KEY).then(dismissed => {
                      if (dismissed !== 'true') {
                        setStrictModeWarningVisible(true);
                      } else {
                        setStrictMode(true);
                        setAllowEmergencyTapout((tapoutStatus?.remaining ?? 0) > 0);
                      }
                    });
                  } else {
                    setStrictMode(false);
                    setAllowEmergencyTapout(false);
                  }
                }}
              />
            </View>
            <AnimatedInfoExpand expanded={!!expandedInfo.strictMode}>
              <View className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Removes the ability to unlock in any way and to dismiss blocked apps or sites. ONLY EXITS: timer expiring or Emergency Tapout (if enabled). Pair with the block settings toggle for maximum strictness.
                </Text>
              </View>
            </AnimatedInfoExpand>

          </View>
        </ExpandableInfo>

        {/* Emergency Tapout Toggle */}
        <ExpandableInfo expanded={strictMode && !noTimeLimit} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, paddingVertical: s(4) }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <View style={{ maxWidth: '75%' }} className="flex-row items-center">
                {tapoutsRemaining === 0 ? (
                  <View className="mr-4">
                    <HeartStraightBreakIcon size={s(iconSize.toggleRow)} color={colors.textMuted} weight="fill" />
                  </View>
                ) : (
                  <Animated.View className="mr-4" style={{ transform: [{ scale: tapoutHeartBeat }], opacity: tapoutHeartBeat.interpolate({ inputRange: [1, 1.15], outputRange: [1, 0.85], extrapolate: 'clamp' }) }}>
                    <Svg width={s(iconSize.toggleRow)} height={s(iconSize.toggleRow)} viewBox="0 -960 960 960" fill={colors.red}>
                      <Path d="M595-468h-230q0 170 115 170t115-170ZM272.5-652.5Q243-625 231-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T340-680q-38 0-67.5 27.5Zm280 0Q523-625 511-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T620-680q-38 0-67.5 27.5ZM480-120l-58-50q-101-88-167-152T150-437q-39-51-54.5-94T80-620q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 89T810-437q-39 51-105 115T538-170l-58 50Z" />
                    </Svg>
                  </Animated.View>
                )}
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Emergency Tapout</Text>
                    <TouchableOpacity onPress={() => toggleInfo('emergencyTapout')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                      <InfoIcon expanded={!!expandedInfo.emergencyTapout} color={colors.textSecondary} size={s(16)} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Use your emergency tapouts for this preset</Text>
                </View>
              </View>
              <AnimatedSwitch
                size="small"
                value={allowEmergencyTapout}
                animate={!skipSwitchAnimation}
                onValueChange={handleEmergencyTapoutToggle}
              />
            </View>
            <AnimatedInfoExpand expanded={!!expandedInfo.emergencyTapout}>
              <View className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Your safety net for Strict Mode blocks. Limited uses that refill +1 every two weeks. Disabling means NO way out except waiting.
                </Text>
              </View>
            </AnimatedInfoExpand>
  
          </View>
        </ExpandableInfo>

        {/* Custom Overlay Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, paddingVertical: s(4) }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <View style={{ maxWidth: '75%' }} className="flex-row items-center">
              <ImageIcon size={s(iconSize.toggleRow)} color={colors.textSecondary} weight="fill" style={{ marginRight: s(14) }} />
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Custom Overlay</Text>
                  <TouchableOpacity onPress={() => toggleInfo('customOverlay')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                    <InfoIcon expanded={!!expandedInfo.customOverlay} color={colors.textSecondary} size={s(16)} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Customize blocked screen text and image</Text>
              </View>
            </View>
            <AnimatedSwitch
              size="small"
              value={customOverlayEnabled}
              animate={!skipSwitchAnimation}
              onValueChange={(value: boolean) => {
                console.log('[OVERLAY] Toggle changed:', value);
                setCustomOverlayEnabled(value);
                if (!value) {
                  setCustomBlockedText('');
                  setCustomOverlayImage('');
                }
              }}
            />
          </View>
          <AnimatedInfoExpand expanded={!!expandedInfo.customOverlay}>
            <View className="px-6 pb-4">
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                When enabled, the overlay that appears when opening a blocked app or website will show your custom message and/or image instead of the defaults.
              </Text>
            </View>
          </AnimatedInfoExpand>
          <ExpandableInfo expanded={customOverlayEnabled}>
            <View className="px-6 pb-4">
              {/* Custom blocked text */}
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} mb-3`}>
                Blocked Message
              </Text>
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                <ArticleNyTimesIcon size={s(iconSize.md)} color={colors.textSecondary} weight="fill" />
                <TextInput
                  value={customBlockedText}
                  onChangeText={(text) => {
                    console.log('[OVERLAY] Text changed:', text);
                    setCustomBlockedText(text);
                  }}
                  placeholder="e.g. Get back to work."
                  placeholderTextColor={colors.textSecondary}
                  maxLength={200}
                  style={{ flex: 1, color: colors.text, marginLeft: s(8) }}
                  className={`${textSize.small} ${fontFamily.regular}`}
                />
              </View>

              {/* Custom overlay image */}
              <Text style={{ color: colors.text, marginTop: s(24) }} className={`${textSize.small} ${fontFamily.semibold} mb-3`}>
                Custom Image
              </Text>
              {customOverlayImage ? (
                <View className="items-center">
                  <View style={{ width: s(120), height: s(120) }}>
                    <TouchableOpacity onPress={handleImageUpload} disabled={imageUploading} activeOpacity={0.7}>
                      <Image
                        source={{ uri: customOverlayImage }}
                        style={{ width: s(120), height: s(120), borderRadius: s(12) }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        console.log('[OVERLAY] Image removed');
                        setCustomOverlayImage('');
                      }}
                      activeOpacity={0.7}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        borderRadius: s(12),
                      }}
                    >
                      <Svg width={s(iconSize.xl)} height={s(iconSize.xl)} viewBox="0 0 24 24" fill={colors.red}>
                        <Path d="M11.67 19.1a1.68 1.68 0 0 1 0 -2.51l4.86 -4.35a2.22 2.22 0 0 1 1.47 -0.57h0.5l0.5 -5.23a0.53 0.53 0 0 0 -0.13 -0.38 0.52 0.52 0 0 0 -0.37 -0.16H11L2.21 7.76l1.23 14.6A1.89 1.89 0 0 0 5.37 24h10.32a2 2 0 0 0 1.16 -0.37 2.43 2.43 0 0 1 -0.32 -0.24Z" />
                        <Path d="M7 5.41 13.75 4l5.92 -1.26 0.15 0a0.74 0.74 0 0 0 -0.15 -1.47 0.85 0.85 0 0 0 -0.16 0l-5.34 1.08 -0.17 -0.62a2.15 2.15 0 0 0 -0.88 -1.34 2.13 2.13 0 0 0 -1.61 -0.3L7.46 1a2.14 2.14 0 0 0 -1.65 2.48l0.13 0.62L0.75 5.2l-0.16 0a0.75 0.75 0 0 0 -0.59 0.92 0.74 0.74 0 0 0 0.73 0.6l0.16 0Zm0.32 -2.24a0.64 0.64 0 0 1 0.49 -0.75l4.05 -0.86 -0.19 -0.74 0.15 0.74a0.62 0.62 0 0 1 0.48 0.08 0.64 0.64 0 0 1 0.27 0.41l0.13 0.61 -5.29 1.13Z" />
                        <Path d="M24 20.47a3.41 3.41 0 0 0 -3.38 -3.38H18v-2.7a0.75 0.75 0 0 0 -1.26 -0.56L13 17.29a0.55 0.55 0 0 0 -0.13 0.18l0 0.06a0.82 0.82 0 0 0 -0.07 0.3 0.73 0.73 0 0 0 0.07 0.3l0 0.06a0.46 0.46 0 0 0 0.13 0.18l3.78 3.45a0.74 0.74 0 0 0 0.51 0.2 0.8 0.8 0 0 0 0.3 -0.06 0.76 0.76 0 0 0 0.41 -0.66v-2.71h2.6a1.88 1.88 0 0 1 0 3.76 0.75 0.75 0 1 0 0 1.5 3.33 3.33 0 0 0 2.24 -0.85A3.38 3.38 0 0 0 24 20.47Z" />
                      </Svg>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={handleImageUpload}
                    activeOpacity={0.7}
                    style={{ backgroundColor: colors.text, borderWidth: 1, borderColor: colors.border, ...shadow.card, marginTop: s(10), paddingHorizontal: s(14), paddingVertical: s(8) }}
                    className={radius.full}
                  >
                    <Text style={{ color: colors.bg }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>
                      {imageUploading ? 'Uploading...' : 'Change'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleImageUpload}
                  activeOpacity={0.7}
                  style={{ backgroundColor: colors.text, borderWidth: 1, borderColor: colors.border, ...shadow.card, marginBottom: s(8) }}
                  className={`${radius.full} ${pill} items-center justify-center flex-row`}
                >
                  <ImageSquareIcon size={s(iconSize.sm)} color={colors.bg} weight="fill" style={{ marginRight: s(6) }} />
                  <Text style={{ color: colors.bg }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    {imageUploading ? 'Uploading...' : 'Upload Image'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Overlay Preview (phone mockup) */}
              <Text style={{ color: colors.text, marginTop: s(24), marginBottom: s(10) }} className={`${textSize.small} ${fontFamily.semibold}`}>Preview</Text>
              <View style={{
                alignSelf: 'center',
                width: s(185),
                aspectRatio: 9 / 19.5,
                backgroundColor: colors.bg,
                borderRadius: s(20),
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: s(16),
                borderWidth: s(3),
                borderColor: '#3A3A3C',
              }}>
                {customOverlayImage ? (
                  <Image
                    source={{ uri: customOverlayImage }}
                    style={{ width: s(100), height: s(100), borderRadius: s(8), marginBottom: s(12) }}
                    resizeMode="cover"
                  />
                ) : (
                  <AndroidLogoIcon size={s(100)} color="#FFFFFF" weight="fill" style={{ marginBottom: s(12) }} />
                )}
                <Text style={{
                  color: '#FFFFFF',
                  textAlign: 'center',
                  fontSize: s(11),
                  lineHeight: s(15),
                  letterSpacing: s(0.3),
                }} className={fontFamily.bold}>
                  {customBlockedText.trim() || 'This app is blocked.'}
                </Text>
                <Text style={{
                  color: '#9CA3AF',
                  fontSize: s(7),
                  marginTop: s(6),
                  letterSpacing: s(0.3),
                }} className={fontFamily.bold}>
                  Tap anywhere to dismiss
                </Text>
              </View>
            </View>
          </ExpandableInfo>

        </View>

        {/* Custom Redirect URL Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, paddingVertical: s(4) }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <View style={{ maxWidth: '75%' }} className="flex-row items-center">
              <View className="mr-4">
                <LinkBrokenIcon size={s(iconSize.toggleRow)} color={colors.textSecondary} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Custom Redirect</Text>
                  <TouchableOpacity onPress={() => toggleInfo('customRedirect')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                    <InfoIcon expanded={!!expandedInfo.customRedirect} color={colors.textSecondary} size={s(16)} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Redirect blocked websites to a custom URL</Text>
              </View>
            </View>
            <AnimatedSwitch
              size="small"
              value={customRedirectEnabled}
              animate={!skipSwitchAnimation}
              onValueChange={(value: boolean) => {
                setCustomRedirectEnabled(value);
                if (!value) {
                  setCustomRedirectUrl('');
                }
              }}
            />
          </View>
          <AnimatedInfoExpand expanded={!!expandedInfo.customRedirect}>
            <View className="px-6 pb-4">
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                When a blocked website is detected, the browser will redirect to this URL instead of the default (google.com).
              </Text>
            </View>
          </AnimatedInfoExpand>
          <ExpandableInfo expanded={customRedirectEnabled}>
            <View className="px-6 pb-4">
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.semibold} mb-3`}>
                Redirect URL
              </Text>
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                <GlobeIcon size={s(iconSize.md)} color={colors.textSecondary} />
                <TextInput
                  value={customRedirectUrl}
                  onChangeText={setCustomRedirectUrl}
                  placeholder="e.g. https://wikipedia.org"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  maxLength={500}
                  style={{ flex: 1, color: colors.text, marginLeft: s(8) }}
                  className={`${textSize.small} ${fontFamily.regular}`}
                />
              </View>
            </View>
          </ExpandableInfo>
        </View>

        {/* Extra bottom padding */}
        <View style={{ height: s(40) }} />

      </ScrollView>

      {/* ============ Modals ============ */}

      {/* No Tapouts Remaining Modal */}
      <InfoModal
        visible={noTapoutsModalVisible}
        title="No Tapouts Remaining"
        message="You have no emergency tapouts remaining. You cannot enable this feature until you have tapouts available."
        onClose={() => setNoTapoutsModalVisible(false)}
      />

      {/* Duplicate Name Modal */}
      <InfoModal
        visible={duplicateNameModalVisible}
        title="Preset Exists"
        message="A preset with the same name already exists. Please choose a different name."
        onClose={() => setDuplicateNameModalVisible(false)}
      />

      {/* Disable Tapout Warning Modal */}
      <DisableTapoutWarningModal
        visible={disableTapoutWarningVisible}
        onConfirm={async (dontShowAgain) => {
          setDisableTapoutWarningVisible(false);
          setAllowEmergencyTapout(false);
          if (dontShowAgain) {
            await AsyncStorage.setItem(DISABLE_TAPOUT_WARNING_DISMISSED_KEY, 'true');
          }
        }}
        onCancel={() => {
          setDisableTapoutWarningVisible(false);
          setAllowEmergencyTapout(true);
        }}
      />

      {/* Block Settings Warning Modal */}
      <BlockSettingsWarningModal
        visible={blockSettingsWarningVisible}
        onConfirm={async (dontShowAgain) => {
          setBlockSettingsWarningVisible(false);
          setBlockSettings(true);
          if (dontShowAgain) {
            await AsyncStorage.setItem(BLOCK_SETTINGS_WARNING_DISMISSED_KEY, 'true');
          }
        }}
        onCancel={() => {
          setBlockSettingsWarningVisible(false);
          setBlockSettings(false);
        }}
      />

      {/* Strict Mode Warning Modal */}
      <StrictModeWarningModal
        visible={strictModeWarningVisible}
        onConfirm={async (dontShowAgain) => {
          setStrictModeWarningVisible(false);
          setStrictMode(true);
          setAllowEmergencyTapout((tapoutStatus?.remaining ?? 0) > 0);
          if (dontShowAgain) {
            await AsyncStorage.setItem(STRICT_MODE_WARNING_DISMISSED_KEY, 'true');
          }
        }}
        onCancel={() => {
          setStrictModeWarningVisible(false);
          setStrictMode(false);
          setAllowEmergencyTapout(false);
        }}
      />


    </View>
  );
}

export default memo(PresetSettingsScreen);
