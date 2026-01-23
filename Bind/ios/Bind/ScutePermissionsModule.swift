import Foundation
import React
import FamilyControls
import UserNotifications

@objc(PermissionsModule)
class ScutePermissionsModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  /// Check all permissions - iOS version (just Screen Time + Notifications)
  @objc
  func checkAllPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 15.0, *) else {
      // Return all as granted for older iOS (features won't work but app won't crash)
      resolve([
        "screenTime": false,
        "notifications": false
      ])
      return
    }

    Task {
      // Check Screen Time authorization
      let screenTimeAuthorized = AuthorizationCenter.shared.authorizationStatus == .approved

      // Check notification permission
      let notificationSettings = await UNUserNotificationCenter.current().notificationSettings()
      let notificationsAuthorized = notificationSettings.authorizationStatus == .authorized

      DispatchQueue.main.async {
        resolve([
          "screenTime": screenTimeAuthorized,
          "notifications": notificationsAuthorized
        ])
      }
    }
  }

  /// Check if Screen Time is authorized
  @objc
  func isScreenTimeAuthorized(_ resolve: @escaping RCTPromiseResolveBlock,
                               rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 15.0, *) else {
      resolve(false)
      return
    }

    let isAuthorized = AuthorizationCenter.shared.authorizationStatus == .approved
    resolve(isAuthorized)
  }

  /// Request Screen Time authorization
  @objc
  func requestScreenTimeAuthorization(_ resolve: @escaping RCTPromiseResolveBlock,
                                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 15.0, *) else {
      reject("UNSUPPORTED", "Screen Time API requires iOS 15+", nil)
      return
    }

    Task {
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        DispatchQueue.main.async {
          resolve(true)
        }
      } catch {
        DispatchQueue.main.async {
          reject("AUTH_FAILED", "Screen Time authorization failed: \(error.localizedDescription)", error)
        }
      }
    }
  }

  /// Request notification permission
  @objc
  func requestNotificationPermission(_ resolve: @escaping RCTPromiseResolveBlock,
                                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      DispatchQueue.main.async {
        if let error = error {
          reject("NOTIF_FAILED", "Notification permission failed: \(error.localizedDescription)", error)
        } else {
          resolve(granted)
        }
      }
    }
  }

  /// Open app settings (for manual permission changes)
  @objc
  func openAppSettings(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if let url = URL(string: UIApplication.openSettingsURLString) {
        UIApplication.shared.open(url)
        resolve(true)
      } else {
        reject("SETTINGS_ERROR", "Could not open settings", nil)
      }
    }
  }

  /// Open Screen Time settings
  @objc
  func openScreenTimeSettings(_ resolve: @escaping RCTPromiseResolveBlock,
                               rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // iOS doesn't have a direct URL to Screen Time, so we open general settings
      if let url = URL(string: "App-prefs:SCREEN_TIME") {
        if UIApplication.shared.canOpenURL(url) {
          UIApplication.shared.open(url)
          resolve(true)
          return
        }
      }
      // Fallback to app settings
      if let url = URL(string: UIApplication.openSettingsURLString) {
        UIApplication.shared.open(url)
        resolve(true)
      } else {
        reject("SETTINGS_ERROR", "Could not open settings", nil)
      }
    }
  }
}
