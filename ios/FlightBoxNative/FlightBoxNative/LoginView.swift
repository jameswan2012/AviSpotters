import SwiftUI
import UIKit

struct LoginView: View {
    @EnvironmentObject var app: AppState
    @EnvironmentObject var auth: AuthStore
    @Environment(\.colorScheme) private var colorScheme
    @State private var identifier = ""
    @State private var password = ""
    @State private var captchaCode = ""
    @State private var showPassword = false

    var body: some View {
        VStack(spacing: 14) {
            AsyncImage(url: APIClient.shared.siteLogoURL(variant: colorScheme == .dark ? "light" : "dark")) { image in
                image.resizable().scaledToFit()
            } placeholder: {
                RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.gray.opacity(0.15))
            }
            .frame(height: 34)
            .frame(maxWidth: .infinity, alignment: .leading)

            Text(I18n.t("login.title", app.language))
                .font(.title2.bold())
                .frame(maxWidth: .infinity, alignment: .leading)

            TextField(I18n.t("login.email", app.language), text: $identifier)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .padding(12)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            HStack(spacing: 8) {
                Group {
                    if showPassword {
                        TextField(I18n.t("login.password", app.language), text: $password)
                    } else {
                        SecureField(I18n.t("login.password", app.language), text: $password)
                    }
                }
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                Button(showPassword ? I18n.t("login.hide", app.language) : I18n.t("login.show", app.language)) {
                    showPassword.toggle()
                }
                .font(.caption)
            }
            .padding(12)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            if let c = auth.captcha {
                HStack(spacing: 10) {
                    if let uiImage = decodeDataUrl(c.image) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 132, height: 44)
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                            .onTapGesture {
                                Task { await auth.refreshCaptcha() }
                            }
                    } else {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 132, height: 44)
                    }

                    TextField(I18n.t("login.captcha", app.language), text: $captchaCode)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onChange(of: captchaCode) { newValue in
                            let cleaned = newValue
                                .uppercased()
                                .filter { $0.isLetter || $0.isNumber }
                            captchaCode = String(cleaned.prefix(8))
                        }
                        .padding(10)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                Text(I18n.t("login.captchaTip", app.language))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                HStack(spacing: 10) {
                    ProgressView()
                    Text(I18n.t("login.loadingCaptcha", app.language))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            if let errorText = auth.errorText {
                Text(errorText)
                    .foregroundStyle(.red)
                    .font(.caption)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            HStack {
                Button(I18n.t("login.refreshCaptcha", app.language)) {
                    Task { await auth.refreshCaptcha() }
                }
                .buttonStyle(.bordered)

                Spacer()

                Button(auth.loading ? I18n.t("common.loading", app.language) : I18n.t("login.signIn", app.language)) {
                    Task {
                        _ = await auth.login(identifier: identifier, password: password, captchaCode: captchaCode, language: app.language)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(auth.loading || identifier.isEmpty || password.isEmpty || captchaCode.count < 4)
            }

            if auth.pendingDeviceChallengeId != nil {
                VStack(alignment: .leading, spacing: 10) {
                    Text(I18n.t("login.deviceVerifyTitle", app.language))
                        .font(.headline)
                    Text(I18n.t("login.deviceVerifyDesc", app.language))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    TextField(I18n.t("login.deviceCode", app.language), text: Binding(
                        get: { auth.pendingDeviceCode },
                        set: { v in
                            let cleaned = v.filter { $0.isNumber }
                            auth.pendingDeviceCode = String(cleaned.prefix(6))
                        }
                    ))
                    .keyboardType(.numberPad)
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                    HStack {
                        Button(auth.resendCooldownSec > 0 ? "\(I18n.t("login.resendCode", app.language)) (\(auth.resendCooldownSec)s)" : I18n.t("login.resendCode", app.language)) {
                            Task { await auth.resendDeviceCode(language: app.language) }
                        }
                        .buttonStyle(.bordered)
                        .disabled(auth.resendCooldownSec > 0)
                        Spacer()
                        Button(I18n.t("login.verifyCode", app.language)) {
                            Task { _ = await auth.verifyDeviceCode(language: app.language) }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(auth.pendingDeviceCode.count != 6)
                    }
                }
                .padding(10)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
        .padding(16)
        .onAppear {
            if identifier.isEmpty, !auth.lastIdentifier.isEmpty {
                identifier = auth.lastIdentifier
            }
            if auth.captcha == nil {
                Task { await auth.refreshCaptcha() }
            }
        }
    }
}

private func decodeDataUrl(_ s: String) -> UIImage? {
    let raw: String
    if let comma = s.firstIndex(of: ",") {
        raw = String(s[s.index(after: comma)...])
    } else {
        raw = s
    }
    let normalized = raw.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    let padding = (4 - normalized.count % 4) % 4
    let padded = normalized + String(repeating: "=", count: padding)
    guard let data = Data(base64Encoded: padded, options: [.ignoreUnknownCharacters]) else { return nil }
    return UIImage(data: data)
}
