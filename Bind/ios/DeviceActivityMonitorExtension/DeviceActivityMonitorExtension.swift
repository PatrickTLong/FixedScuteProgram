import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

/// This extension monitors device activity and applies shields when blocked apps are accessed
class DeviceActivityMonitorExtension: DeviceActivityMonitor {

  private let store = ManagedSettingsStore()

  /// Called when a scheduled activity interval begins
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)

    // Get the shared UserDefaults
    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")

    // Load blocked app tokens and apply shields
    if let appTokensData = sharedDefaults?.data(forKey: "blockedAppTokens"),
       let appTokens = try? JSONDecoder().decode(Set<ApplicationToken>.self, from: appTokensData) {
      store.shield.applications = appTokens
    }

    // Load blocked category tokens
    if let categoryTokensData = sharedDefaults?.data(forKey: "blockedCategoryTokens"),
       let categoryTokens = try? JSONDecoder().decode(Set<ActivityCategoryToken>.self, from: categoryTokensData) {
      store.shield.applicationCategories = .specific(categoryTokens)
    }

    // Load blocked websites
    if let websitesData = sharedDefaults?.data(forKey: "blockedWebsites"),
       let websites = try? JSONDecoder().decode([String].self, from: websitesData) {
      var webDomains = Set<WebDomain>()
      for site in websites {
        if let domain = WebDomain(domain: site) {
          webDomains.insert(domain)
        }
      }
      store.shield.webDomains = webDomains
    }

    // Mark as blocking
    sharedDefaults?.set(true, forKey: "isBlocking")

    // Store which preset triggered this for the app to know on launch
    let presetId = activity.rawValue.replacingOccurrences(of: "scute_preset_", with: "")
    sharedDefaults?.set(presetId, forKey: "launchFromScheduledPreset")
    sharedDefaults?.synchronize()

    // Send notification that blocking has started
    sendNotification(
      title: "Blocking Started",
      body: "Your scheduled focus session has begun."
    )
  }

  /// Called when a scheduled activity interval ends
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)

    // Clear all shields
    store.shield.applications = nil
    store.shield.applicationCategories = nil
    store.shield.webDomains = nil

    // Clear blocking state
    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")
    sharedDefaults?.set(false, forKey: "isBlocking")
    sharedDefaults?.removeObject(forKey: "launchFromScheduledPreset")
    sharedDefaults?.synchronize()

    // Send notification that blocking has ended
    sendNotification(
      title: "Blocking Ended",
      body: "Your focus session has ended. Your apps are now unlocked."
    )
  }

  /// Called when a shielded app is accessed
  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)

    // This is called when usage thresholds are reached
    // For blocking, we mainly use shields which auto-block
  }

  /// Helper to send local notifications
  private func sendNotification(title: String, body: String) {
    let content = UNMutableNotificationContent()
    content.title = title
    content.body = body
    content.sound = .default

    let request = UNNotificationRequest(
      identifier: UUID().uuidString,
      content: content,
      trigger: nil // Send immediately
    )

    UNUserNotificationCenter.current().add(request)
  }
}
