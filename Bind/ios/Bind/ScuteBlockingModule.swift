import Foundation
import React
import FamilyControls
import ManagedSettings
import DeviceActivity

@objc(BlockingModule)
class ScuteBlockingModule: NSObject {

  private let store = ManagedSettingsStore()
  private let center = AuthorizationCenter.shared

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  /// Start blocking with the given configuration
  @objc
  func startBlocking(_ config: NSDictionary,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 15.0, *) else {
      reject("UNSUPPORTED", "Screen Time API requires iOS 15+", nil)
      return
    }

    DispatchQueue.main.async {
      do {
        // Get blocked apps from shared UserDefaults (set by app picker)
        let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")

        // Apply app blocking shield
        if let appTokensData = sharedDefaults?.data(forKey: "blockedAppTokens"),
           let appTokens = try? JSONDecoder().decode(Set<ApplicationToken>.self, from: appTokensData) {
          self.store.shield.applications = appTokens
        }

        // Apply website blocking
        if let websitesData = sharedDefaults?.data(forKey: "blockedWebsites"),
           let websites = try? JSONDecoder().decode([String].self, from: websitesData) {
          // Create WebDomain objects for each blocked website
          var webDomains = Set<WebDomain>()
          for site in websites {
            if let domain = WebDomain(domain: site) {
              webDomains.insert(domain)
            }
          }
          self.store.shield.webDomains = webDomains
        }

        // Block Settings if requested
        let blockSettings = config["blockSettings"] as? Bool ?? false
        if blockSettings {
          // Shield the Settings app category
          self.store.shield.applicationCategories = .all(except: Set())
        }

        // Store session info
        let noTimeLimit = config["noTimeLimit"] as? Bool ?? false
        let lockEndTimeMs = config["lockEndTimeMs"] as? Double ?? 0
        let presetName = config["presetName"] as? String ?? ""
        let presetId = config["presetId"] as? String ?? ""
        let isScheduled = config["isScheduled"] as? Bool ?? false

        sharedDefaults?.set(true, forKey: "isBlocking")
        sharedDefaults?.set(presetName, forKey: "activePresetName")
        sharedDefaults?.set(presetId, forKey: "activePresetId")
        sharedDefaults?.set(noTimeLimit, forKey: "noTimeLimit")
        sharedDefaults?.set(isScheduled, forKey: "isScheduled")

        if lockEndTimeMs > 0 {
          sharedDefaults?.set(lockEndTimeMs, forKey: "lockEndTimeMs")

          // Schedule end notification if not scheduled preset (scheduled uses DeviceActivitySchedule)
          if !isScheduled {
            self.scheduleEndNotification(at: Date(timeIntervalSince1970: lockEndTimeMs / 1000), presetName: presetName)
          }
        }

        sharedDefaults?.synchronize()

        resolve(["success": true])
      }
    }
  }

  /// Stop blocking and clear all shields
  @objc
  func forceUnlock(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 15.0, *) else {
      reject("UNSUPPORTED", "Screen Time API requires iOS 15+", nil)
      return
    }

    DispatchQueue.main.async {
      // Clear all shields
      self.store.shield.applications = nil
      self.store.shield.webDomains = nil
      self.store.shield.applicationCategories = nil

      // Clear session info
      let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")
      sharedDefaults?.set(false, forKey: "isBlocking")
      sharedDefaults?.removeObject(forKey: "activePresetName")
      sharedDefaults?.removeObject(forKey: "activePresetId")
      sharedDefaults?.removeObject(forKey: "lockEndTimeMs")
      sharedDefaults?.removeObject(forKey: "noTimeLimit")
      sharedDefaults?.removeObject(forKey: "isScheduled")
      sharedDefaults?.synchronize()

      // Cancel any pending notifications
      UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["scute_timer_end"])

      resolve(["success": true])
    }
  }

  /// Check if currently blocking
  @objc
  func isBlocking(_ resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")
    let isBlocking = sharedDefaults?.bool(forKey: "isBlocking") ?? false
    resolve(isBlocking)
  }

  /// Schedule notification when timer ends
  private func scheduleEndNotification(at date: Date, presetName: String) {
    let content = UNMutableNotificationContent()
    content.title = "Blocking Session Ended"
    content.body = "\(presetName) has finished. Your apps are now unlocked."
    content.sound = .default

    let trigger = UNTimeIntervalNotificationTrigger(
      timeInterval: max(1, date.timeIntervalSinceNow),
      repeats: false
    )

    let request = UNNotificationRequest(
      identifier: "scute_timer_end",
      content: content,
      trigger: trigger
    )

    UNUserNotificationCenter.current().add(request)
  }
}
