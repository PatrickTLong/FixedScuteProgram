import React, { memo, useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme , textSize, fontFamily, radius, shadow, buttonPadding, iconSize } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import AnimatedSwitch from './AnimatedSwitch';

// Clock icon for expired presets
const ClockIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z"
    />
  </Svg>
);

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
}

interface PresetCardProps {
  preset: Preset;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggle: (value: boolean) => void;
  onExpired?: (preset: Preset) => void;
  disabled?: boolean;
}

// Expiration status type
type ExpirationStatus = 'expired' | 'blocking' | 'pending' | null;

function PresetCard({ preset, isActive, onPress, onLongPress, onToggle, onExpired, disabled = false }: PresetCardProps) {
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
        if (newStatus === 'expired' && prev !== 'expired' && !hasCalledExpired.current) {
          hasCalledExpired.current = true;
          onExpired?.(preset);
        }
        return newStatus;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [getExpirationStatus, onExpired, preset]);

  // Reset hasCalledExpired when preset's time properties change (e.g., user edits preset)
  useEffect(() => {
    hasCalledExpired.current = false;
  }, [preset.id, preset.targetDate, preset.scheduleStartDate, preset.scheduleEndDate]);

  const isExpired = status === 'expired';

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
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: s(buttonPadding.standard),
        paddingHorizontal: s(buttonPadding.standard),
        ...shadow.card,
      }}
      className={`${radius['2xl']} mb-3`}
    >
      <View className="flex-row items-center">
        <View className="flex-1">
          {/* Preset Name with Badges */}
          <View className="mb-1">
            <Text style={{ color: isExpired ? colors.textMuted : colors.text }} className={`${textSize.large} ${fontFamily.semibold}`}>
              {preset.name}
              {status !== null && (
                <Text>{' '}<ClockIcon color={getClockColor()} size={iconSize.sm} /></Text>
              )}
            </Text>
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
        <AnimatedSwitch
          size="small"
          value={isActive && !isExpired}
          onValueChange={handleToggle}
          disabled={disabled || isExpired}
          animate={!isExpired}
        />
      </View>
    </Pressable>
  );
}

export default memo(PresetCard);
