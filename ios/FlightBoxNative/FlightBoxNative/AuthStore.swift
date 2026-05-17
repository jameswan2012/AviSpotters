import Foundation
import SwiftUI

struct AppUser: Decodable {
    let id: String
    let email: String
    let name: String?
    let points: Int
    let roleId: Int
    let priorityPasses: Int?
}

struct CaptchaPayload: Decodable {
    let id: String
    let image: String
}

@MainActor
final class AuthStore: ObservableObject {
    @Published var user: AppUser?
    @Published var loading = false
    @Published var errorText: String?
    @Published var captcha: CaptchaPayload?
    @Published var lastIdentifier: String = UserDefaults.standard.string(forKey: "auth.lastIdentifier") ?? ""
    @Published var pendingDeviceChallengeId: String?
    @Published var pendingDeviceCode: String = ""
    @Published var resendCooldownSec: Int = 0
    private var cooldownTask: Task<Void, Never>?

    func bootstrap() async {
        await refreshMe()
        await refreshCaptcha()
    }

    func refreshMe() async {
        do {
            user = try await APIClient.shared.fetchMe()
        } catch {
            user = nil
        }
    }

    func refreshCaptcha() async {
        do {
            captcha = try await APIClient.shared.fetchCaptcha()
        } catch {
            captcha = nil
        }
    }

    func login(identifier: String, password: String, captchaCode: String, language: AppLanguage) async -> Bool {
        loading = true
        errorText = nil
        defer { loading = false }
        if captcha == nil {
            await refreshCaptcha()
        }
        guard let c = captcha else {
            errorText = I18n.t("login.error.captchaUnavailable", language)
            return false
        }
        do {
            let u = try await APIClient.shared.login(
                identifier: identifier,
                password: password,
                captchaId: c.id,
                captchaCode: captchaCode,
                deviceId: UIDevice.current.identifierForVendor?.uuidString ?? "ios-device"
            )
            user = u
            pendingDeviceChallengeId = nil
            pendingDeviceCode = ""
            lastIdentifier = identifier.trimmingCharacters(in: .whitespacesAndNewlines)
            UserDefaults.standard.set(lastIdentifier, forKey: "auth.lastIdentifier")
            return true
        } catch {
            if case APIError.deviceVerificationRequired(let challenge) = error {
                pendingDeviceChallengeId = challenge.challengeId
                pendingDeviceCode = ""
                errorText = I18n.t("login.error.newDevice", language)
                startResendCooldown(seconds: 60)
                return false
            }
            errorText = I18n.error(error.localizedDescription, language)
            await refreshCaptcha()
            return false
        }
    }

    func resendDeviceCode(language: AppLanguage) async {
        guard let challengeId = pendingDeviceChallengeId else { return }
        do {
            let cooldown = try await APIClient.shared.resendDeviceLoginCode(challengeId: challengeId)
            errorText = I18n.t("login.error.codeResent", language)
            startResendCooldown(seconds: max(1, cooldown / 1000))
        } catch {
            errorText = I18n.error(error.localizedDescription, language)
        }
    }

    func verifyDeviceCode(language: AppLanguage) async -> Bool {
        guard let challengeId = pendingDeviceChallengeId else { return false }
        let code = pendingDeviceCode.trimmingCharacters(in: .whitespacesAndNewlines)
        guard code.count == 6 else {
            errorText = I18n.t("login.error.codeInvalid", language)
            return false
        }
        do {
            let u = try await APIClient.shared.verifyDeviceLogin(
                challengeId: challengeId,
                code: code,
                deviceId: UIDevice.current.identifierForVendor?.uuidString ?? "ios-device"
            )
            user = u
            pendingDeviceChallengeId = nil
            pendingDeviceCode = ""
            errorText = nil
            return true
        } catch {
            let mapped = I18n.error(error.localizedDescription, language)
            errorText = mapped
            if error.localizedDescription == "challenge_expired" || mapped == I18n.error("challenge_expired", language) {
                pendingDeviceChallengeId = nil
                pendingDeviceCode = ""
            }
            return false
        }
    }

    func logout() async {
        do {
            try await APIClient.shared.logout()
        } catch {
            // ignore
        }
        user = nil
    }

    private func startResendCooldown(seconds: Int) {
        cooldownTask?.cancel()
        resendCooldownSec = seconds
        cooldownTask = Task { @MainActor [weak self] in
            while let self, self.resendCooldownSec > 0, !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if Task.isCancelled { break }
                self.resendCooldownSec = max(0, self.resendCooldownSec - 1)
            }
        }
    }
}
