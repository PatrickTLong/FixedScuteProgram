import React, { memo, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
} from 'react-native';
import { lightTap, mediumTap } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';
import AnimatedSwitch from './AnimatedSwitch';

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
}

interface PresetCardProps {
  preset: Preset;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
  onExpired?: () => void; // Called when preset is detected as expired while active
}

function PresetCard({ preset, isActive, onPress, onLongPress, onToggle, disabled = false, onExpired }: PresetCardProps) {
  const { colors } = useTheme();
  // Only force re-render when we're close to expiration
  const [, setTick] = useState(0);

  // Check if preset is expired - memoized to avoid recalculation
  // Recurring presets show expired only if end date passed AND disabled
  const isExpired = useMemo(() => {
    const now = new Date();
    if (preset.isScheduled) {
      // Recurring presets: show expired only if end date passed AND not active
      if (preset.repeat_enabled) {
        const endDatePassed = preset.scheduleEndDate ? now >= new Date(preset.scheduleEndDate) : false;
        const expired = endDatePassed && !isActive;
        console.log('[PresetCard] Recurring preset expired check:', {
          name: preset.name,
          isActive,
          endDatePassed,
          expired
        });
        return expired;
      }
      // Scheduled presets with dates
      if (preset.scheduleStartDate && preset.scheduleEndDate) {
        const endDate = new Date(preset.scheduleEndDate);
        // If end time passed, it's expired
        if (now >= endDate) return true;
        // If start time passed and it's not active, it's expired (missed the window)
        const startDate = new Date(preset.scheduleStartDate);
        if (now >= startDate && !isActive) return true;
      }
      // Scheduled presets with no time limit (no dates) - never expire
      return false;
    }
    // Non-scheduled presets with target date
    if (preset.targetDate && !preset.noTimeLimit) {
      return new Date(preset.targetDate) < now;
    }
    return false;
  }, [preset.isScheduled, preset.scheduleStartDate, preset.scheduleEndDate, preset.targetDate, preset.noTimeLimit, isActive, preset.repeat_enabled]);

  // Timer to check expiration - only runs when close to expiration (within 2 minutes)
  useEffect(() => {
    // Only set up timer if preset has a date that could expire
    const hasRelevantDate = preset.isScheduled
      ? (preset.scheduleStartDate || preset.scheduleEndDate)
      : (preset.targetDate && !preset.noTimeLimit);
    if (!hasRelevantDate || isExpired) return;

    // Calculate time until expiration
    const now = new Date();
    let expirationDate: Date | null = null;

    if (preset.isScheduled && preset.scheduleEndDate) {
      expirationDate = new Date(preset.scheduleEndDate);
    } else if (preset.targetDate) {
      expirationDate = new Date(preset.targetDate);
    }

    if (!expirationDate) return;

    const timeUntilExpiration = expirationDate.getTime() - now.getTime();

    // Only tick every second if within 2 minutes of expiration
    // Otherwise, set a timeout to start ticking when we're close
    if (timeUntilExpiration <= 120000) {
      // Within 2 minutes - tick every second
      const interval = setInterval(() => {
        setTick(t => t + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      // More than 2 minutes away - set timeout to start ticking later
      const timeout = setTimeout(() => {
        setTick(t => t + 1); // Trigger re-render to start interval
      }, timeUntilExpiration - 120000);
      return () => clearTimeout(timeout);
    }
  }, [preset.isScheduled, preset.scheduleStartDate, preset.scheduleEndDate, preset.targetDate, preset.noTimeLimit, isExpired]);

  // Check if recurring preset needs renewal (end time passed)
  const needsRenewal = useMemo(() => {
    if (!preset.isScheduled || !preset.repeat_enabled || !preset.scheduleEndDate) {
      return false;
    }
    const now = new Date();
    const endDate = new Date(preset.scheduleEndDate);
    const needs = now >= endDate;
    console.log('[PresetCard] Recurring preset needsRenewal check:', {
      name: preset.name,
      isActive,
      endDate: preset.scheduleEndDate,
      now: now.toISOString(),
      needsRenewal: needs
    });
    return needs;
  }, [preset.isScheduled, preset.repeat_enabled, preset.scheduleEndDate, isActive, preset.name]);

  // Auto-deactivate expired presets OR trigger renewal for recurring presets
  useEffect(() => {
    if (onExpired) {
      if (isExpired && isActive) {
        // Non-recurring preset expired
        console.log('[PresetCard] Triggering onExpired for non-recurring preset:', preset.name);
        onExpired();
      } else if (needsRenewal && isActive) {
        // Recurring preset needs renewal
        console.log('[PresetCard] Triggering onExpired for recurring preset renewal:', preset.name);
        onExpired();
      }
    }
  }, [isExpired, isActive, onExpired, needsRenewal, preset.name]);

  const formatScheduleDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeDescription = () => {
    const parts = [];

    // Handle scheduled presets
    if (preset.isScheduled) {
      if (preset.scheduleStartDate && preset.scheduleEndDate) {
        parts.push(`${formatScheduleDate(preset.scheduleStartDate)} - ${formatScheduleDate(preset.scheduleEndDate)}`);

        // Add recurring interval info
        if (preset.repeat_enabled && preset.repeat_interval && preset.repeat_unit) {
          const interval = preset.repeat_interval;
          const unit = preset.repeat_unit;
          const unitLabel = interval === 1 ? unit.slice(0, -1) : unit; // Remove 's' for singular
          parts.push(`Repeats every ${interval} ${unitLabel}`);
        }
      } else {
        parts.push('No schedule set');
      }
    } else if (preset.noTimeLimit) {
      parts.push('No time limit');
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
      parts.push(`Until ${dateStr} at ${timeStr}`);
    } else {
      const timeParts = [];
      const seconds = preset.timerSeconds ?? 0;
      if (preset.timerDays > 0) timeParts.push(`${preset.timerDays}d`);
      if (preset.timerHours > 0) timeParts.push(`${preset.timerHours}h`);
      if (preset.timerMinutes > 0) timeParts.push(`${preset.timerMinutes}m`);
      if (seconds > 0) timeParts.push(`${seconds}s`);
      if (timeParts.length > 0) {
        parts.push(timeParts.join(' '));
      }
    }

    // Add emergency tapout info
    if (preset.allowEmergencyTapout) {
      parts.push('Emergency tapout');
    }

    if (preset.blockSettings) {
      parts.push('Settings blocked');
    }

    return parts.length > 0 ? parts.join(' • ') : 'No time set';
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
      lightTap();
      onPress();
    }
  }, [disabled, onPress]);

  const handleLongPress = useCallback(() => {
    if (!disabled) {
      mediumTap();
      onLongPress();
    }
  }, [disabled, onLongPress]);

  const handleToggle = useCallback((value: boolean) => {
    if (!disabled && !isExpired) {
      mediumTap();
      onToggle(value);
    }
  }, [disabled, isExpired, onToggle]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={{ backgroundColor: colors.card }}
      className="rounded-2xl p-4 mb-3"
    >
      <View className="flex-row items-center">
        <View className="flex-1">
          {/* Preset Name with Badges */}
          <View className="flex-row items-center mb-1">
            <Text style={{ color: isExpired ? colors.textMuted : colors.text }} className="text-lg font-nunito-semibold">
              {preset.name}
            </Text>
            {isExpired ? (
              <View style={{ backgroundColor: `${colors.red}33` }} className="ml-2 px-2 py-0.5 rounded">
                <Text style={{ color: colors.red }} className="text-xs font-nunito-semibold">
                  Expired
                </Text>
              </View>
            ) : (
              <>
                {preset.isScheduled && (
                  <View style={{ backgroundColor: `${colors.cyan}33` }} className="ml-2 px-2 py-0.5 rounded">
                    <Text style={{ color: colors.cyan }} className="text-xs font-nunito-semibold">
                      Scheduled
                    </Text>
                  </View>
                )}
                {preset.repeat_enabled && (
                  <View style={{ backgroundColor: '#a855f733' }} className="ml-2 px-2 py-0.5 rounded">
                    <Text style={{ color: '#a855f7' }} className="text-xs font-nunito-semibold">
                      Recurring
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Settings Description */}
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
            {getSettingsDescription()}
          </Text>

          {/* Time */}
          <Text style={{ color: colors.textMuted }} className="text-sm font-nunito mt-1">
            {getTimeDescription()}
          </Text>
        </View>

        {/* Toggle Switch */}
        <AnimatedSwitch
          value={isActive && !isExpired}
          onValueChange={handleToggle}
          disabled={disabled || isExpired}
          trackColorFalse={colors.border}
          trackColorTrue="#16a34a"
          thumbColorOn={colors.green}
          thumbColorOff="#9ca3af"
        />
      </View>
    </Pressable>
  );
}

export default memo(PresetCard);
