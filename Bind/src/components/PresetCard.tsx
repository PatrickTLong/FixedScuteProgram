import React, { memo, useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { AlarmIcon, XCircleIcon } from 'phosphor-react-native';
import Svg, { Path } from 'react-native-svg';

const SkullIcon = ({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M4.11 9.8 3 9.05a1.26 1.26 0 0 1 -0.58 -0.82L1.8 4c0.7 0.64 1.56 1.42 2.51 2.26a8.62 8.62 0 0 1 0.59 -1.45c-1.69 -1.51 -3 -2.73 -3.61 -3.34a0.76 0.76 0 0 0 -0.87 -0.15 0.75 0.75 0 0 0 -0.42 0.78l0.9 6.37a2.75 2.75 0 0 0 1.25 1.84l2.69 1.76a7.85 7.85 0 0 1 -0.73 -2.27Z" />
    <Path d="M24 20.29a2 2 0 0 0 -0.9 -1.24l-3.77 -2.3 0.85 -1.09a0.75 0.75 0 1 0 -1.18 -0.93l-0.93 1.19 -0.07 -0.06V16a3 3 0 0 1 -2.66 3l0.24 0.16 -0.7 0.88a0.77 0.77 0 0 0 0.12 1.02 0.74 0.74 0 0 0 0.46 0.16 0.76 0.76 0 0 0 0.6 -0.29l0.78 -1L21 22.47a2 2 0 0 0 1 0.29 2 2 0 0 0 2 -2.47Z" />
    <Path d="M19.69 6.29c0.95 -0.84 1.81 -1.62 2.52 -2.27l-0.6 4.18a1.25 1.25 0 0 1 -0.6 0.86l-1.12 0.74a7.85 7.85 0 0 1 -0.74 2.27l2.66 -1.74a2.76 2.76 0 0 0 1.28 -1.89L24 2.1a0.75 0.75 0 0 0 -0.41 -0.78 0.76 0.76 0 0 0 -0.87 0.15c-0.59 0.61 -1.93 1.84 -3.62 3.34a7.65 7.65 0 0 1 0.59 1.48Z" />
    <Path d="M6 16v-0.14l-0.07 0.06L5 14.73a0.75 0.75 0 1 0 -1.18 0.93l0.85 1.09 -3.77 2.3a2 2 0 0 0 -0.67 2.75 2 2 0 0 0 1.24 0.9 2 2 0 0 0 0.47 0.06 2 2 0 0 0 1 -0.29l4.17 -2.54 0.78 1a0.76 0.76 0 0 0 0.6 0.29 0.74 0.74 0 0 0 0.51 -0.16 0.77 0.77 0 0 0 0.12 -1.06l-0.7 -0.88 0.24 -0.12A3 3 0 0 1 6 16Z" />
    <Path d="M13.5 16a1.5 1.5 0 0 0 3 0v-2.82a6.5 6.5 0 1 0 -9 0V16a1.5 1.5 0 0 0 3 0 1.5 1.5 0 0 0 3 0Zm1.62 -9a1.5 1.5 0 1 1 -1.5 1.5 1.5 1.5 0 0 1 1.5 -1.5Zm-6 0a1.5 1.5 0 1 1 -1.5 1.5A1.5 1.5 0 0 1 9.12 7Z" />
  </Svg>
);
import { useTheme , textSize, fontFamily, radius, shadow, buttonPadding, iconSize, haptics } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';


import { useAuth } from '../context/AuthContext';
import AnimatedSwitch from './AnimatedSwitch';

const PinIcon = ({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <Path d="M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0Zm4.8 17.74a0.5 0.5 0 0 1 -0.2 0.48 0.51 0.51 0 0 1 -0.52 0l-3.86 -1.93a0.51 0.51 0 0 0 -0.45 0l-3.84 1.97a0.51 0.51 0 0 1 -0.52 0 0.5 0.5 0 0 1 -0.2 -0.48l0.65 -4.27a0.48 0.48 0 0 0 -0.14 -0.42L4.69 10A0.5 0.5 0 0 1 5 9.13l4.26 -0.7a0.5 0.5 0 0 0 0.37 -0.26l2 -3.83a0.5 0.5 0 0 1 0.89 0l2 3.83a0.47 0.47 0 0 0 0.36 0.26l4.25 0.7a0.5 0.5 0 0 1 0.4 0.34 0.49 0.49 0 0 1 -0.12 0.5l-3 3.08a0.51 0.51 0 0 0 -0.14 0.42Z" fill={color} />
  </Svg>
);

// Schedule status uses Phosphor Clock variants

// Pure date formatting helper - no component state dependency
function formatScheduleDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + ' ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export interface Preset {
  id: string;
  name: string;
  mode: 'all' | 'specific';
  selectedApps: string[];
  blockedWebsites: string[];
  timerDays: number;
  timerHours: number;
  timerMinutes: number;
  timerSeconds: number;
  blockSettings: boolean;
  noTimeLimit: boolean;
  isDefault: boolean;
  isActive: boolean;
  targetDate?: string | null; // ISO date string for countdown to specific date
  // Emergency tapout feature
  allowEmergencyTapout?: boolean;
  // Scheduling feature
  isScheduled?: boolean;
  scheduleStartDate?: string | null; // ISO date string - when blocking starts
  scheduleEndDate?: string | null; // ISO date string - when blocking ends
  // Recurring schedule feature (DB columns)
  repeat_enabled?: boolean;
  repeat_unit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  repeat_interval?: number;
  // Strict mode - when enabled, presets are locked and require emergency tapout to unlock
  // When disabled, slide-to-unlock is available for all presets
  strictMode?: boolean;
  // Custom blocked message - replaces default "X is blocked." overlay text
  customBlockedText?: string;
  // Custom overlay image URL (replaces center icon)
  customOverlayImage?: string;
  // Custom redirect URL - where browser goes when a blocked website is detected (default: google.com)
  customRedirectUrl?: string;
}

interface PresetCardProps {
  preset: Preset;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggle: (value: boolean) => void;
  onExpired?: (preset: Preset) => void;
  disabled?: boolean;
  starred?: boolean;
  onStarToggle?: () => void;
}

// Expiration status type
type ExpirationStatus = 'expired' | 'blocking' | 'pending' | null;

function PresetCard({ preset, isActive, onPress, onLongPress, onToggle, onExpired, disabled = false, starred = false, onStarToggle }: PresetCardProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const { sharedIsLocked } = useAuth();

  // Compute expiration status based on preset type
  const getExpirationStatus = useCallback((): ExpirationStatus => {
    const now = new Date();

    // Date picker presets (targetDate): only show expired clock, no pending/blocking
    if (preset.targetDate) {
      const targetDate = new Date(preset.targetDate);
      if (now > targetDate) {
        return 'expired';
      }
      // Not expired - no clock for dated presets
      return null;
    }

    // Scheduled presets: expire if toggle is OFF and past start date (missed blocking window)
    if (preset.isScheduled && preset.scheduleStartDate && preset.scheduleEndDate) {
      // Recurring presets with toggle ON never expire - they keep recurring
      if (preset.repeat_enabled && isActive) {
        const startDate = new Date(preset.scheduleStartDate);
        const endDate = new Date(preset.scheduleEndDate);
        // In window = blocking, otherwise = pending (waiting for next occurrence)
        if (now >= startDate && now < endDate) {
          return 'blocking';
        }
        return 'pending';
      }

      const startDate = new Date(preset.scheduleStartDate);
      const endDate = new Date(preset.scheduleEndDate);

      // Past end date = expired (for non-recurring or toggle OFF)
      if (now > endDate) {
        return 'expired';
      }

      // In the blocking window (past start, before end)
      if (now > startDate) {
        if (isActive) {
          return 'blocking';
        } else {
          // Toggle OFF and past start date = missed the window, expired
          return 'expired';
        }
      }

      // Before start date = pending (yellow) regardless of toggle
      return 'pending';
    }

    // Non-date, non-scheduled presets don't show status
    return null;
  }, [preset.targetDate, preset.isScheduled, preset.scheduleStartDate, preset.scheduleEndDate, isActive, sharedIsLocked]);

  const [status, setStatus] = useState<ExpirationStatus>(() => getExpirationStatus());
  const hasCalledExpired = useRef(false);

  // Update status periodically and call onExpired when preset expires
  useEffect(() => {
    // Initial check - if already expired and active, call onExpired immediately
    const initialStatus = getExpirationStatus();
    if (initialStatus === 'expired' && preset.isActive && !hasCalledExpired.current) {
      hasCalledExpired.current = true;
      onExpired?.(preset);
    }
    setStatus(initialStatus);

    // Periodic check for time-based changes
    const interval = setInterval(() => {
      const newStatus = getExpirationStatus();
      setStatus(prev => {
        if (newStatus !== prev) return newStatus;
        return prev;
      });
      // Call onExpired outside of setState updater to avoid setState-during-render
      if (newStatus === 'expired' && !hasCalledExpired.current) {
        hasCalledExpired.current = true;
        onExpired?.(preset);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [getExpirationStatus, onExpired, preset]);

  // Reset hasCalledExpired when preset's time properties change (e.g., user edits preset)
  useEffect(() => {
    hasCalledExpired.current = false;
  }, [preset.id, preset.targetDate, preset.scheduleStartDate, preset.scheduleEndDate]);

  const isExpired = status === 'expired';
  const isLockedActive = sharedIsLocked && isActive;
  const isDimmed = isExpired || isLockedActive;

  const getClockColor = () => {
    switch (status) {
      case 'expired': return colors.red;
      case 'blocking': return colors.green;
      case 'pending': return colors.yellow;
      default: return colors.textMuted;
    }
  };

  const getTimeDescription = () => {
    // Handle scheduled presets
    if (preset.isScheduled) {
      if (preset.scheduleStartDate && preset.scheduleEndDate) {
        return `${formatScheduleDate(preset.scheduleStartDate)} - ${formatScheduleDate(preset.scheduleEndDate)}`;
      } else {
        return 'No schedule set';
      }
    } else if (preset.noTimeLimit) {
      return 'No time limit';
    } else if (preset.targetDate) {
      // Show target date and time
      const date = new Date(preset.targetDate);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `Until ${dateStr} at ${timeStr}`;
    } else {
      const timeParts = [];
      const seconds = preset.timerSeconds ?? 0;
      if (preset.timerDays > 0) timeParts.push(`${preset.timerDays}d`);
      if (preset.timerHours > 0) timeParts.push(`${preset.timerHours}h`);
      if (preset.timerMinutes > 0) timeParts.push(`${preset.timerMinutes}m`);
      if (seconds > 0) timeParts.push(`${seconds}s`);
      if (timeParts.length > 0) {
        return timeParts.join(' ');
      }
    }
    return 'No time set';
  };

  const getDetailsDescription = () => {
    const parts = [];

    if (preset.isScheduled) {
      parts.push('Scheduled');
    }

    if (preset.repeat_enabled && preset.repeat_interval && preset.repeat_unit) {
      const unit = preset.repeat_interval === 1 ? preset.repeat_unit.replace(/s$/, '') : preset.repeat_unit;
      parts.push(`Recurs every ${preset.repeat_interval} ${unit}`);
    }

    // Add strict mode info
    if (preset.strictMode) {
      parts.push('Strict mode');
    }

    // Add emergency tapout info (only when strict mode is on and has a time limit)
    if (preset.allowEmergencyTapout && preset.strictMode && !preset.noTimeLimit) {
      parts.push('Emergency tapout');
    }

    if (preset.blockSettings) {
      parts.push('Settings blocked');
    }

    if (preset.customBlockedText || preset.customOverlayImage) {
      parts.push('Custom overlay');
    }

    if (preset.customRedirectUrl) {
      parts.push('Custom redirect');
    }

    return parts.length > 0 ? parts.join(', ') : null;
  };

  const getSettingsDescription = () => {
    if (preset.mode === 'all') {
      return 'Block all apps';
    }
    // Don't show count for default presets
    if (preset.isDefault) {
      return 'Block selected apps';
    }
    const count = preset.selectedApps.length + preset.blockedWebsites.length;
    return `${count} item${count !== 1 ? 's' : ''} blocked`;
  };

  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress();
    }
  }, [disabled, onPress]);

  const handleLongPress = useCallback(() => {
    if (!disabled) {
      if (haptics.presetCard.enabled) {
        triggerHaptic(haptics.presetCard.type);
      }
      onLongPress();
    }
  }, [disabled, onLongPress]);

  const handleToggle = useCallback((value: boolean) => {
    if (!disabled && !isExpired) {
      onToggle(value);
    }
  }, [disabled, isExpired, onToggle]);

  return (
    <Pressable
      onPressIn={() => {
        if (disabled) return;
        if (!isLockedActive && haptics.presetCard.enabled) triggerHaptic(haptics.presetCard.type);
      }}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        overflow: 'hidden',
        paddingVertical: s(buttonPadding.standard + 4),
        paddingHorizontal: s(buttonPadding.standard + 4),
        ...shadow.card,
      }}
      className="mb-3"
    >
      <View className="flex-row items-center">
        <View className="flex-1">
          {/* Preset Name with Badges */}
          <View className="flex-row items-center mb-1">
            <Text style={{ color: isDimmed ? colors.textMuted : colors.text, flexShrink: 1 }} className={`${textSize.large} ${fontFamily.semibold}`}>
              {preset.name}
            </Text>
            <Pressable
              onPress={onStarToggle}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ marginLeft: s(6) }}
            >
              <PinIcon size={s(iconSize.sm)} color={starred ? '#a78bfa' : colors.textMuted} />
            </Pressable>
            {preset.strictMode && (
              <View style={{ marginLeft: s(6) }}>
                <SkullIcon size={s(iconSize.sm)} color={colors.textSecondary} />
              </View>
            )}
            {status !== null && (
              <View className="ml-2">
                {status === 'expired' ? (
                  <AlarmIcon size={iconSize.sm} color={getClockColor()} weight="fill" />
                ) : (
                  <AlarmIcon size={iconSize.sm} color={getClockColor()} weight="fill" />
                )}
              </View>
            )}
          </View>

          {/* Settings Description */}
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
            {getSettingsDescription()}
          </Text>

          {/* Time */}
          <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
            {getTimeDescription()}
          </Text>

          {/* Details (strict mode, emergency tapout, settings blocked) */}
          {(() => {
            const details = getDetailsDescription();
            return details ? (
              <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-0.5`}>
                {details}
              </Text>
            ) : null;
          })()}
        </View>

        {/* Toggle Switch */}
        <View style={{ alignItems: 'center' }}>
          {sharedIsLocked && !disabled && !isExpired && (
            <XCircleIcon size={iconSize.xs} color={colors.red} weight="fill" style={{ position: 'absolute', top: s(-20), zIndex: 1 }} />
          )}
          <AnimatedSwitch
            size="small"
            value={isActive && !isExpired}
            onValueChange={handleToggle}
            disabled={disabled || isExpired || sharedIsLocked}
            animate={!isExpired}
          />
          {/* Invisible overlay catches taps on disabled toggle when locked to show modal */}
          {sharedIsLocked && !disabled && !isExpired && (
            <Pressable
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              onPress={() => onToggle(!isActive)}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default memo(PresetCard);
