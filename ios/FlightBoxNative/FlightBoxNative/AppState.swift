import Foundation
import SwiftUI

enum AppThemeMode: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }
}

@MainActor
final class AppState: ObservableObject {
    @Published var language: AppLanguage
    @Published var apiBase: String
    @Published var themeMode: AppThemeMode
    @Published var maintenanceEnabled: Bool = false
    @Published var maintenanceMessage: String = ""

    init() {
        let savedLang = UserDefaults.standard.string(forKey: "app.language") ?? AppLanguage.zhHans.rawValue
        self.language = AppLanguage(rawValue: savedLang) ?? .zhHans
        self.apiBase = UserDefaults.standard.string(forKey: "app.apiBase") ?? "http://localhost:3000"
        self.themeMode = AppThemeMode(rawValue: UserDefaults.standard.string(forKey: "app.themeMode") ?? "") ?? .system
        if let url = URL(string: self.apiBase) {
            APIClient.shared.baseURL = url
        }
    }

    func setLanguage(_ lang: AppLanguage) {
        language = lang
        UserDefaults.standard.set(lang.rawValue, forKey: "app.language")
    }

    func setApiBase(_ value: String) {
        apiBase = value
        UserDefaults.standard.set(value, forKey: "app.apiBase")
        if let url = URL(string: value) {
            APIClient.shared.baseURL = url
        }
    }

    func setThemeMode(_ mode: AppThemeMode) {
        themeMode = mode
        UserDefaults.standard.set(mode.rawValue, forKey: "app.themeMode")
    }

    var preferredColorScheme: ColorScheme? {
        switch themeMode {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }

    func refreshMaintenance() async {
        do {
            let m = try await APIClient.shared.fetchMaintenance()
            maintenanceEnabled = m.enabled
            maintenanceMessage = m.message ?? ""
        } catch {
            maintenanceEnabled = false
            maintenanceMessage = ""
        }
    }
}
