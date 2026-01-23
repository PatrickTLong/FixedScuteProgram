import Foundation
import React
import FamilyControls
import SwiftUI

@objc(InstalledAppsModule)
class ScuteInstalledAppsModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  /// Show the native iOS app picker (FamilyActivityPicker)
  /// This presents a system UI where users can select apps to block
  @objc
  func showAppPicker(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 15.0, *) else {
      reject("UNSUPPORTED", "FamilyActivityPicker requires iOS 15+", nil)
      return
    }

    DispatchQueue.main.async {
      // Get the current selection from UserDefaults
      let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")

      // Create and present the picker
      let picker = FamilyActivityPickerViewController { selection in
        // Save the selection to shared UserDefaults
        do {
          let appTokensData = try JSONEncoder().encode(selection.applicationTokens)
          sharedDefaults?.set(appTokensData, forKey: "blockedAppTokens")

          let categoryTokensData = try JSONEncoder().encode(selection.categoryTokens)
          sharedDefaults?.set(categoryTokensData, forKey: "blockedCategoryTokens")

          sharedDefaults?.synchronize()

          // Return count info (we can't get app names from tokens)
          resolve([
            "appCount": selection.applicationTokens.count,
            "categoryCount": selection.categoryTokens.count,
            "success": true
          ])
        } catch {
          reject("ENCODE_ERROR", "Failed to save selection: \(error.localizedDescription)", error)
        }
      }

      // Present the picker
      if let rootVC = UIApplication.shared.keyWindow?.rootViewController {
        var topVC = rootVC
        while let presented = topVC.presentedViewController {
          topVC = presented
        }
        topVC.present(picker, animated: true)
      } else {
        reject("NO_VIEW", "Could not find root view controller", nil)
      }
    }
  }

  /// Get the current app selection count
  @objc
  func getSelectedAppsCount(_ resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 15.0, *) else {
      resolve(0)
      return
    }

    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")

    var count = 0
    if let appTokensData = sharedDefaults?.data(forKey: "blockedAppTokens"),
       let appTokens = try? JSONDecoder().decode(Set<ApplicationToken>.self, from: appTokensData) {
      count = appTokens.count
    }

    resolve(count)
  }

  /// Clear the app selection
  @objc
  func clearSelection(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {

    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")
    sharedDefaults?.removeObject(forKey: "blockedAppTokens")
    sharedDefaults?.removeObject(forKey: "blockedCategoryTokens")
    sharedDefaults?.synchronize()

    resolve(true)
  }

  /// Save blocked websites to UserDefaults
  @objc
  func saveBlockedWebsites(_ websites: [String],
                           resolver resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {

    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")

    do {
      let data = try JSONEncoder().encode(websites)
      sharedDefaults?.set(data, forKey: "blockedWebsites")
      sharedDefaults?.synchronize()
      resolve(true)
    } catch {
      reject("ENCODE_ERROR", "Failed to save websites: \(error.localizedDescription)", error)
    }
  }

  /// Get blocked websites from UserDefaults
  @objc
  func getBlockedWebsites(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {

    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")

    if let data = sharedDefaults?.data(forKey: "blockedWebsites"),
       let websites = try? JSONDecoder().decode([String].self, from: data) {
      resolve(websites)
    } else {
      resolve([])
    }
  }
}

/// UIKit wrapper for FamilyActivityPicker
@available(iOS 15.0, *)
class FamilyActivityPickerViewController: UIViewController {

  private var onSelection: ((FamilyActivitySelection) -> Void)?
  private var selection = FamilyActivitySelection()

  convenience init(onSelection: @escaping (FamilyActivitySelection) -> Void) {
    self.init()
    self.onSelection = onSelection
  }

  override func viewDidLoad() {
    super.viewDidLoad()

    // Load existing selection
    let sharedDefaults = UserDefaults(suiteName: "group.com.bind.scute")
    if let appTokensData = sharedDefaults?.data(forKey: "blockedAppTokens"),
       let appTokens = try? JSONDecoder().decode(Set<ApplicationToken>.self, from: appTokensData) {
      selection.applicationTokens = appTokens
    }
    if let categoryTokensData = sharedDefaults?.data(forKey: "blockedCategoryTokens"),
       let categoryTokens = try? JSONDecoder().decode(Set<ActivityCategoryToken>.self, from: categoryTokensData) {
      selection.categoryTokens = categoryTokens
    }

    // Create SwiftUI picker and embed it
    let pickerView = FamilyActivityPicker(selection: Binding(
      get: { self.selection },
      set: { self.selection = $0 }
    ))

    let hostingController = UIHostingController(rootView:
      NavigationView {
        pickerView
          .navigationTitle("Select Apps to Block")
          .navigationBarTitleDisplayMode(.inline)
          .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
              Button("Cancel") {
                self.dismiss(animated: true)
              }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
              Button("Done") {
                self.onSelection?(self.selection)
                self.dismiss(animated: true)
              }
              .fontWeight(.semibold)
            }
          }
      }
    )

    addChild(hostingController)
    view.addSubview(hostingController.view)
    hostingController.view.frame = view.bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    hostingController.didMove(toParent: self)
  }
}
