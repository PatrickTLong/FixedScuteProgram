import React, { memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TimerPicker from './TimerPicker';
import { lightTap, mediumTap } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';

interface ConfigModalProps {
  visible: boolean;
  configMode: 'all' | 'specific' | null;
  selectedApps: string[];
  blockedWebsites: string[];
  websiteInput: string;
  isWebsiteValid: boolean;
  blockSettings: boolean;
  noTimeLimit: boolean;
  timerDays: number;
  timerHours: number;
  timerMinutes: number;
  onClose: () => void;
  onSave: () => void;
  onOpenAppSelector: () => void;
  onWebsiteInputChange: (text: string) => void;
  onAddWebsite: () => void;
  onRemoveWebsite: (site: string) => void;
  onToggleBlockSettings: () => void;
  onToggleNoTimeLimit: () => void;
  onDaysChange: (value: number) => void;
  onHoursChange: (value: number) => void;
  onMinutesChange: (value: number) => void;
}

function ConfigModal({
  visible,
  configMode,
  selectedApps,
  blockedWebsites,
  websiteInput,
  isWebsiteValid,
  blockSettings,
  noTimeLimit,
  timerDays,
  timerHours,
  timerMinutes,
  onClose,
  onSave,
  onOpenAppSelector,
  onWebsiteInputChange,
  onAddWebsite,
  onRemoveWebsite,
  onToggleBlockSettings,
  onToggleNoTimeLimit,
  onDaysChange,
  onHoursChange,
  onMinutesChange,
}: ConfigModalProps) {
  const { s } = useResponsive();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: s(16),
          paddingVertical: s(12),
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#eee',
        }}>
          <TouchableOpacity
            onPressIn={lightTap}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ minWidth: s(60) }}
          >
            <Text style={{ color: '#007AFF', fontSize: s(16) }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: s(17), fontWeight: '600', flex: 1, textAlign: 'center' }}>
            {configMode === 'all' ? 'Disable Phone Use' : 'Select Apps'}
          </Text>
          <TouchableOpacity
            onPressIn={lightTap}
            onPress={onSave}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ minWidth: s(60), alignItems: 'flex-end' }}
          >
            <Text style={{ color: '#007AFF', fontSize: s(16), fontWeight: '600' }}>Save</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: s(16) }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {/* App Selection Button */}
            {configMode === 'specific' && (
              <TouchableOpacity
                onPressIn={lightTap}
                onPress={onOpenAppSelector}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: s(16),
                  marginHorizontal: s(16),
                  marginTop: s(16),
                  backgroundColor: '#fff',
                  borderRadius: s(12),
                }}
              >
                <View>
                  <Text style={{ fontSize: s(16), fontWeight: '500', color: '#333' }}>Select Apps</Text>
                  <Text style={{ fontSize: s(14), color: '#666', marginTop: s(2) }}>
                    {selectedApps.length === 0 ? 'No apps selected' : `${selectedApps.length} apps selected`}
                  </Text>
                </View>
                <Text style={{ fontSize: s(20), color: '#ccc' }}>›</Text>
              </TouchableOpacity>
            )}

            {/* Website Blocking - Only show for specific apps mode */}
            {configMode === 'specific' && (
              <View style={{
                marginHorizontal: s(16),
                marginTop: s(16),
                backgroundColor: '#fff',
                borderRadius: s(12),
                padding: s(16),
              }}>
                <Text style={{ fontSize: s(16), fontWeight: '500', color: '#333', marginBottom: s(12) }}>Block Websites</Text>

                <View style={{ flexDirection: 'row', gap: s(8) }}>
                  <TextInput
                    value={websiteInput}
                    onChangeText={onWebsiteInputChange}
                    placeholder="e.g. instagram.com"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    style={{
                      flex: 1,
                      height: s(44),
                      borderWidth: 1,
                      borderColor: '#ddd',
                      borderRadius: s(8),
                      paddingHorizontal: s(12),
                      fontSize: s(15),
                      color: '#333',
                      backgroundColor: '#f9f9f9',
                    }}
                  />
                  <TouchableOpacity
                    onPressIn={lightTap}
                    onPress={onAddWebsite}
                    disabled={!isWebsiteValid}
                    style={{
                      width: s(44),
                      height: s(44),
                      backgroundColor: isWebsiteValid ? '#007AFF' : '#ccc',
                      borderRadius: s(8),
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: s(28), fontWeight: '400', lineHeight: s(28), textAlign: 'center' }}>+</Text>
                  </TouchableOpacity>
                </View>

                {blockedWebsites.length > 0 && (
                  <View style={{ marginTop: s(12), flexDirection: 'row', flexWrap: 'wrap', gap: s(8) }}>
                    {blockedWebsites.map((site) => (
                      <TouchableOpacity
                        key={site}
                        onPressIn={lightTap}
                        onPress={() => onRemoveWebsite(site)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#e3f2fd',
                          paddingVertical: s(6),
                          paddingLeft: s(12),
                          paddingRight: s(8),
                          borderRadius: s(16),
                        }}
                      >
                        <Text style={{ color: '#1976D2', fontSize: s(13), marginRight: s(4) }}>
                          {site.length > 8 ? `${site.substring(0, 8)}...` : site}
                        </Text>
                        <Text style={{ color: '#1976D2', fontSize: s(16) }}>×</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {blockedWebsites.length === 0 && (
                  <Text style={{ color: '#999', fontSize: s(13), marginTop: s(8) }}>
                    No websites blocked. Add domains above.
                  </Text>
                )}
              </View>
            )}

            {/* Toggles and Timer Section */}
            <View style={{
              marginHorizontal: s(16),
              marginTop: s(16),
              backgroundColor: '#fff',
              borderRadius: s(12),
              overflow: 'hidden',
            }}>
              {/* Block Settings Toggle */}
              <TouchableOpacity
                onPressIn={mediumTap}
                onPress={onToggleBlockSettings}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: s(12),
                  paddingHorizontal: s(16),
                }}
              >
                <View style={{
                  width: s(22),
                  height: s(22),
                  borderRadius: s(6),
                  backgroundColor: blockSettings ? '#ff9800' : '#ddd',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: s(12),
                }}>
                  {blockSettings && <Text style={{ color: '#fff', fontSize: s(14), fontWeight: 'bold' }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: s(15), fontWeight: '500', color: '#333' }}>Block Settings App</Text>
                  <Text style={{ fontSize: s(12), color: '#888', marginTop: s(1) }}>
                    WiFi & emergency remain accessible
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={{ height: 1, backgroundColor: '#eee', marginHorizontal: s(16) }} />

              {/* No Time Limit Toggle */}
              <TouchableOpacity
                onPressIn={mediumTap}
                onPress={onToggleNoTimeLimit}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: s(12),
                  paddingHorizontal: s(16),
                }}
              >
                <View style={{
                  width: s(22),
                  height: s(22),
                  borderRadius: s(6),
                  backgroundColor: noTimeLimit ? '#007AFF' : '#ddd',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: s(12),
                }}>
                  {noTimeLimit && <Text style={{ color: '#fff', fontSize: s(14), fontWeight: 'bold' }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: s(15), fontWeight: '500', color: '#333' }}>No Time Limit</Text>
                  <Text style={{ fontSize: s(12), color: '#888', marginTop: s(1) }}>
                    Block until manually unlocked
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Timer Section */}
              {!noTimeLimit && (
                <>
                  <View style={{ height: 1, backgroundColor: '#eee', marginHorizontal: s(16) }} />
                  <View style={{ paddingHorizontal: s(16), paddingTop: s(12), paddingBottom: s(8) }}>
                    <Text style={{
                      fontSize: s(13),
                      fontWeight: '500',
                      color: '#666',
                      marginBottom: s(4),
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      Duration
                    </Text>
                    <TimerPicker
                      days={timerDays}
                      hours={timerHours}
                      minutes={timerMinutes}
                      onDaysChange={onDaysChange}
                      onHoursChange={onHoursChange}
                      onMinutesChange={onMinutesChange}
                    />
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default memo(ConfigModal);
