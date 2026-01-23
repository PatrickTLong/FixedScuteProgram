import Foundation
import React
import DeviceActivity
import FamilyControls
import ManagedSettings

@objc(ScheduleModule)
class ScuteScheduleModule: NSObject {

  private let center = DeviceActivityCenter()

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  /// Save scheduled presets and set up DeviceActivitySchedule
  @objc
  func saveScheduledPresets(_ presetsJson: String,
                            resolver resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 15.0, *) else {
      reject("UNSUPPORTED", "DeviceActivity requires iOS 15+", nil)
      return
    }

    // Save to UserDefaults for the extension to access
    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")
    sharedDefaults?.set(presetsJson, forKey: "scheduledPresets")
    sharedDefaults?.synchronize()

    // Parse presets and schedule device activity monitoring
    do {
      guard let data = presetsJson.data(using: .utf8),
            let presets = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
        reject("PARSE_ERROR", "Failed to parse presets JSON", nil)
        return
      }

      // Stop all existing monitoring first
      center.stopMonitoring()

      // Schedule each preset
      for preset in presets {
        guard let presetId = preset["id"] as? String,
              let isActive = preset["isActive"] as? Bool,
              isActive,
              let startDateStr = preset["scheduleStartDate"] as? String,
              let endDateStr = preset["scheduleEndDate"] as? String else {
          continue
        }

        // Parse dates
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let startDate = formatter.date(from: startDateStr) ?? ISO8601DateFormatter().date(from: startDateStr),
              let endDate = formatter.date(from: endDateStr) ?? ISO8601DateFormatter().date(from: endDateStr) else {
          continue
        }

        // Skip if already ended
        if endDate <= Date() {
          continue
        }

        // Create schedule
        let calendar = Calendar.current
        let startComponents = calendar.dateComponents([.hour, .minute, .second], from: startDate)
        let endComponents = calendar.dateComponents([.hour, .minute, .second], from: endDate)

        let schedule = DeviceActivitySchedule(
          intervalStart: startComponents,
          intervalEnd: endComponents,
          repeats: preset["isRecurring"] as? Bool ?? false
        )

        // Start monitoring for this preset
        let activityName = DeviceActivityName(rawValue: "scute_preset_\(presetId)")

        do {
          try center.startMonitoring(activityName, during: schedule)
        } catch {
          print("Failed to schedule preset \(presetId): \(error)")
        }
      }

      resolve(["success": true])
    } catch {
      reject("SCHEDULE_ERROR", "Failed to schedule presets: \(error.localizedDescription)", error)
    }
  }

  /// Cancel a specific preset's alarm
  @objc
  func cancelPresetAlarm(_ presetId: String,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 15.0, *) else {
      resolve(true)
      return
    }

    let activityName = DeviceActivityName(rawValue: "scute_preset_\(presetId)")
    center.stopMonitoring([activityName])

    resolve(true)
  }

  /// Cancel all preset alarms
  @objc
  func cancelAllAlarms(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 15.0, *) else {
      resolve(true)
      return
    }

    center.stopMonitoring()

    // Clear from UserDefaults
    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")
    sharedDefaults?.removeObject(forKey: "scheduledPresets")
    sharedDefaults?.synchronize()

    resolve(true)
  }

  /// Get scheduled presets from storage
  @objc
  func getScheduledPresets(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {

    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")
    let presetsJson = sharedDefaults?.string(forKey: "scheduledPresets") ?? "[]"
    resolve(presetsJson)
  }

  /// Check if a preset was launched from schedule (called on app launch)
  @objc
  func checkScheduledLaunch(_ resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {

    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")

    if let launchPresetId = sharedDefaults?.string(forKey: "launchFromScheduledPreset") {
      // Clear the flag
      sharedDefaults?.removeObject(forKey: "launchFromScheduledPreset")
      sharedDefaults?.synchronize()

      resolve([
        "wasScheduledLaunch": true,
        "presetId": launchPresetId
      ])
    } else {
      resolve([
        "wasScheduledLaunch": false
      ])
    }
  }
}
