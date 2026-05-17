import SwiftUI
import PhotosUI
import UIKit

struct ProfileView: View {
    private enum LocalProfileUploadError: LocalizedError {
        case tooLarge
        var errorDescription: String? {
            switch self {
            case .tooLarge: return "profile_image_too_large_local"
            }
        }
    }

    @EnvironmentObject var app: AppState
    @EnvironmentObject var auth: AuthStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var testResult: String?
    @State private var testing = false
    @State private var profile: AccountProfileUser?
    @State private var loadingProfile = false
    @State private var profileError: String?
    @State private var draftName = ""
    @State private var draftBio = ""
    @State private var draft2FA = true
    @State private var savingProfile = false
    @State private var selectedAvatarItem: PhotosPickerItem?
    @State private var selectedBackgroundItem: PhotosPickerItem?
    @State private var uploadingAvatar = false
    @State private var uploadingBackground = false
    @State private var showingSupport = false
    @State private var showingStaffChat = false

    var body: some View {
        Form {
            Section(I18n.t("profile.account", app.language)) {
                if let u = auth.user {
                    let displayName = (profile?.name ?? u.name)?.trimmingCharacters(in: .whitespacesAndNewlines)
                    HStack(alignment: .top, spacing: 12) {
                        if let p = profile, let avatar = p.avatarUrl, let url = profileImageURL(avatar) {
                            AsyncImage(url: url) { img in
                                img.resizable().scaledToFill()
                            } placeholder: {
                                Color.gray.opacity(0.2)
                            }
                            .frame(width: 72, height: 72)
                            .clipShape(Circle())
                        } else {
                            Circle()
                                .fill(Color.gray.opacity(0.2))
                                .frame(width: 72, height: 72)
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            Text((displayName?.isEmpty == false ? displayName! : u.email))
                                .font(.title3.bold())
                                .lineLimit(1)
                            Text(u.email)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Button(I18n.t("profile.signOut", app.language)) {
                                Task { await auth.logout() }
                            }
                            .buttonStyle(.bordered)
                        }
                        Spacer()
                    }
                    LabeledContent(I18n.t("profile.role", app.language), value: "\(u.roleId)")
                    LabeledContent(I18n.t("profile.points", app.language), value: "\(u.points)")
                    if let p = profile {
                        if let bg = p.backgroundUrl, let url = profileImageURL(bg) {
                            AsyncImage(url: url) { img in
                                img.resizable().scaledToFill()
                            } placeholder: {
                                Color.gray.opacity(0.2)
                            }
                            .frame(height: 110)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        Group {
                            if horizontalSizeClass == .compact {
                                VStack(alignment: .leading, spacing: 8) {
                                    PhotosPicker(selection: $selectedAvatarItem, matching: .images, photoLibrary: .shared()) {
                                        Text(uploadingAvatar ? I18n.t("profile.uploadingAvatar", app.language) : I18n.t("profile.changeAvatar", app.language))
                                    }
                                    .disabled(uploadingAvatar)
                                    PhotosPicker(selection: $selectedBackgroundItem, matching: .images, photoLibrary: .shared()) {
                                        Text(uploadingBackground ? I18n.t("profile.uploadingBackground", app.language) : I18n.t("profile.changeBackground", app.language))
                                    }
                                    .disabled(uploadingBackground)
                                }
                            } else {
                                HStack {
                                    PhotosPicker(selection: $selectedAvatarItem, matching: .images, photoLibrary: .shared()) {
                                        Text(uploadingAvatar ? I18n.t("profile.uploadingAvatar", app.language) : I18n.t("profile.changeAvatar", app.language))
                                    }
                                    .disabled(uploadingAvatar)
                                    PhotosPicker(selection: $selectedBackgroundItem, matching: .images, photoLibrary: .shared()) {
                                        Text(uploadingBackground ? I18n.t("profile.uploadingBackground", app.language) : I18n.t("profile.changeBackground", app.language))
                                    }
                                    .disabled(uploadingBackground)
                                }
                            }
                        }
                        Text(I18n.t("profile.avatarHint", app.language))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(I18n.t("profile.backgroundHint", app.language))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    Text(I18n.t("profile.notSignedInHint", app.language))
                    LoginView()
                }
            }

            if auth.user != nil {
                Section(I18n.t("profile.edit", app.language)) {
                    TextField(I18n.t("profile.name", app.language), text: $draftName)
                    TextField(I18n.t("profile.bio", app.language), text: $draftBio, axis: .vertical)
                        .lineLimit(3...6)
                    Toggle(I18n.t("profile.email2fa", app.language), isOn: $draft2FA)
                    Button(savingProfile ? I18n.t("profile.saving", app.language) : I18n.t("profile.save", app.language)) {
                        Task { await saveProfile() }
                    }
                    .disabled(savingProfile || auth.user == nil)
                    if let profileError {
                        Text(profileError).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }

            if auth.user != nil {
                Section(I18n.t("profile.services", app.language)) {
                    Button(I18n.t("profile.supportThread", app.language)) {
                        showingSupport = true
                    }
                    if (auth.user?.roleId ?? 0) >= 2 {
                        Button(I18n.t("profile.staffChat", app.language)) {
                            showingStaffChat = true
                        }
                    }
                }
            }

            Section(I18n.t("profile.language", app.language)) {
                Picker(I18n.t("profile.language", app.language), selection: Binding(
                    get: { app.language },
                    set: { app.setLanguage($0) }
                )) {
                    ForEach(AppLanguage.allCases) { lang in
                        Text(lang.displayName).tag(lang)
                    }
                }
            }

            Section(I18n.t("profile.theme", app.language)) {
                Picker(I18n.t("profile.theme", app.language), selection: Binding(
                    get: { app.themeMode },
                    set: { app.setThemeMode($0) }
                )) {
                    Text(I18n.t("profile.theme.system", app.language)).tag(AppThemeMode.system)
                    Text(I18n.t("profile.theme.light", app.language)).tag(AppThemeMode.light)
                    Text(I18n.t("profile.theme.dark", app.language)).tag(AppThemeMode.dark)
                }
            }

            Section(I18n.t("profile.connection", app.language)) {
                TextField(I18n.t("profile.apiBase", app.language), text: Binding(
                    get: { app.apiBase },
                    set: { app.setApiBase($0) }
                ))
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Button(I18n.t("profile.apply", app.language)) {
                    app.setApiBase(app.apiBase)
                }
                Button(testing ? I18n.t("profile.testing", app.language) : I18n.t("profile.testConnection", app.language)) {
                    Task {
                        testing = true
                        defer { testing = false }
                        testResult = await APIClient.shared.testConnection()
                    }
                }
                .disabled(testing)
                if let testResult {
                    Text(testResult).font(.caption).foregroundStyle(.secondary)
                }
                Button(I18n.t("profile.useLocalhost", app.language)) {
                    app.setApiBase("http://localhost:3000")
                }
                Button(I18n.t("profile.useLan", app.language)) {
                    app.setApiBase("http://192.168.112.225:3000")
                }
            }

            Section(I18n.t("profile.about", app.language)) {
                Text(I18n.t("profile.aboutLine1", app.language))
                Text(I18n.t("profile.aboutLine2", app.language))
            }
        }
        .navigationTitle(I18n.t("profile.title", app.language))
        .task {
            await auth.refreshMe()
            await app.refreshMaintenance()
            await loadProfile()
        }
        .sheet(isPresented: $showingSupport) {
            NavigationStack { SupportThreadView() }
        }
        .sheet(isPresented: $showingStaffChat) {
            NavigationStack { StaffChatRoomsView() }
        }
        .onChange(of: selectedAvatarItem?.itemIdentifier) { _ in
            Task { await handleAvatarPicked() }
        }
        .onChange(of: selectedBackgroundItem?.itemIdentifier) { _ in
            Task { await handleBackgroundPicked() }
        }
    }

    private func loadProfile() async {
        guard auth.user != nil else { return }
        loadingProfile = true
        defer { loadingProfile = false }
        do {
            let p = try await APIClient.shared.fetchAccountProfile()
            profile = p
            draftName = p.name ?? ""
            draftBio = p.profileBio ?? ""
            draft2FA = p.email2faEnabled ?? true
            profileError = nil
        } catch {
            profileError = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func saveProfile() async {
        guard let email = auth.user?.email else { return }
        savingProfile = true
        defer { savingProfile = false }
        do {
            let p = try await APIClient.shared.updateAccountProfile(
                email: email,
                name: draftName,
                profileBio: draftBio,
                email2faEnabled: draft2FA
            )
            profile = p
            await auth.refreshMe()
            profileError = I18n.t("profile.saved", app.language)
        } catch {
            profileError = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func profileImageURL(_ raw: String) -> URL? {
        if raw.hasPrefix("http://") || raw.hasPrefix("https://") {
            return URL(string: raw)
        }
        if raw.hasPrefix("/") {
            return APIClient.shared.baseURL.appending(path: String(raw.dropFirst()))
        }
        return URL(string: raw)
    }

    private func handleAvatarPicked() async {
        guard let item = selectedAvatarItem else { return }
        selectedAvatarItem = nil
        uploadingAvatar = true
        defer { uploadingAvatar = false }
        do {
            guard let data = try await loadUploadableImageData(item: item, maxBytes: 950 * 1024, maxDimension: 1200) else {
                profileError = I18n.t("profile.pickImageFailed", app.language)
                return
            }
            _ = try await APIClient.shared.uploadAvatar(imageData: data, fileName: "avatar.jpg", mimeType: "image/jpeg")
            await loadProfile()
            profileError = I18n.t("profile.avatarUpdated", app.language)
        } catch {
            profileError = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func handleBackgroundPicked() async {
        guard let item = selectedBackgroundItem else { return }
        selectedBackgroundItem = nil
        uploadingBackground = true
        defer { uploadingBackground = false }
        do {
            guard let data = try await loadUploadableImageData(item: item, maxBytes: 4_900 * 1024, maxDimension: 2400) else {
                profileError = I18n.t("profile.pickImageFailed", app.language)
                return
            }
            _ = try await APIClient.shared.uploadBackground(imageData: data, fileName: "background.jpg", mimeType: "image/jpeg")
            await loadProfile()
            profileError = I18n.t("profile.backgroundUpdated", app.language)
        } catch {
            profileError = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func loadUploadableImageData(item: PhotosPickerItem, maxBytes: Int, maxDimension: CGFloat) async throws -> Data? {
        guard let raw = try await item.loadTransferable(type: Data.self) else { return nil }
        guard let image = UIImage(data: raw) else {
            return raw
        }
        let resized = resizeImageIfNeeded(image, maxDimension: maxDimension)
        var quality: CGFloat = 0.9
        while quality >= 0.45 {
            if let jpeg = resized.jpegData(compressionQuality: quality), jpeg.count <= maxBytes {
                return jpeg
            }
            quality -= 0.15
        }
        if let jpeg = resized.jpegData(compressionQuality: 0.35), jpeg.count <= maxBytes {
            return jpeg
        }
        throw LocalProfileUploadError.tooLarge
    }

    private func resizeImageIfNeeded(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let maxEdge = max(size.width, size.height)
        guard maxEdge > maxDimension, maxEdge > 0 else { return image }
        let scale = maxDimension / maxEdge
        let target = CGSize(width: floor(size.width * scale), height: floor(size.height * scale))
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: target, format: format)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
    }
}

private struct SupportThreadView: View {
    @EnvironmentObject var app: AppState
    @State private var thread: SupportThreadPayload?
    @State private var loading = false
    @State private var message: String?
    @State private var text = ""
    @State private var sending = false
    @State private var pollTask: Task<Void, Never>?
    @State private var pendingNewCount = 0
    @State private var autoScrollNew = true
    @State private var scrollRequestToken = 0
    private let bottomAnchor = "support-bottom-anchor"

    var body: some View {
        ScrollViewReader { proxy in
            List {
                if let thread {
                    Section {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(I18n.t("support.status", app.language)): \(I18n.status(thread.conversation.status, app.language))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(
                                thread.conversation.assignedStaffId == nil
                                    ? I18n.t("support.assigned.unassigned", app.language)
                                    : I18n.t("support.assigned.assigned", app.language)
                            )
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        }
                        ForEach(thread.messages) { m in
                            VStack(alignment: m.mine ? .trailing : .leading, spacing: 4) {
                                Text(m.body)
                                    .font(.subheadline)
                                Text(m.createdAt.replacingOccurrences(of: "T", with: " ").replacingOccurrences(of: "Z", with: ""))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: m.mine ? .trailing : .leading)
                        }
                    }
                }
                if pendingNewCount > 0 {
                    Section {
                        Button("\(pendingNewCount) \(I18n.t("support.newMessages", app.language))") {
                            autoScrollNew = true
                            pendingNewCount = 0
                            requestScrollToBottom()
                        }
                    }
                }
                if let message {
                    Section { Text(message).foregroundStyle(.secondary) }
                }
                Section {
                    Toggle(I18n.t("support.autoScroll", app.language), isOn: $autoScrollNew)
                    TextField(I18n.t("support.input", app.language), text: $text, axis: .vertical)
                        .lineLimit(2...4)
                    Button(sending ? I18n.t("support.sending", app.language) : I18n.t("support.send", app.language)) {
                        Task { await send() }
                    }
                    .disabled(sending || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    Button(I18n.t("support.jumpLatest", app.language)) {
                        autoScrollNew = true
                        pendingNewCount = 0
                        requestScrollToBottom()
                    }
                }
                Color.clear
                    .frame(height: 1)
                    .listRowInsets(EdgeInsets())
                    .id(bottomAnchor)
            }
            .overlay { if loading { ProgressView() } }
            .navigationTitle(I18n.t("profile.supportThread", app.language))
            .task {
                await reload(showLoading: true)
                requestScrollToBottom()
                startPolling()
            }
            .onDisappear {
                pollTask?.cancel()
                pollTask = nil
            }
            .onChange(of: scrollRequestToken) { _ in
                withAnimation(.easeInOut(duration: 0.2)) {
                    proxy.scrollTo(bottomAnchor, anchor: .bottom)
                }
            }
            .refreshable { await reload(showLoading: true) }
        }
    }

    private func reload(showLoading: Bool) async {
        if showLoading { loading = true }
        defer { if showLoading { loading = false } }
        do {
            let oldIds = Set((thread?.messages ?? []).map(\.id))
            let payload = try await APIClient.shared.fetchSupportThread()
            let newCount = oldIds.isEmpty ? 0 : payload.messages.filter { !oldIds.contains($0.id) }.count
            thread = payload
            if newCount > 0 {
                if autoScrollNew {
                    pendingNewCount = 0
                    requestScrollToBottom()
                } else {
                    pendingNewCount += newCount
                }
            }
            message = nil
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func send() async {
        let body = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return }
        sending = true
        defer { sending = false }
        do {
            try await APIClient.shared.sendSupportMessage(body: body)
            text = ""
            autoScrollNew = true
            pendingNewCount = 0
            await reload(showLoading: true)
            requestScrollToBottom()
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func startPolling() {
        pollTask?.cancel()
        pollTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 5_000_000_000)
                if Task.isCancelled { break }
                await reload(showLoading: false)
            }
        }
    }

    private func requestScrollToBottom() {
        scrollRequestToken += 1
    }
}

private struct StaffChatRoomsView: View {
    @EnvironmentObject var app: AppState
    @State private var rooms: [ChatRoomItem] = []
    @State private var loading = false
    @State private var message: String?

    var body: some View {
        List {
            if rooms.isEmpty && !loading {
                Section { Text(message ?? I18n.t("chat.empty", app.language)).foregroundStyle(.secondary) }
            }
            ForEach(rooms) { room in
                NavigationLink {
                    StaffChatRoomDetailView(room: room)
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(room.name).font(.subheadline.bold())
                        Text(I18n.t("chat.updatedAt", app.language) + ": " + room.updatedAt.replacingOccurrences(of: "T", with: " ").replacingOccurrences(of: "Z", with: ""))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .overlay { if loading { ProgressView() } }
        .navigationTitle(I18n.t("profile.staffChat", app.language))
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            rooms = try await APIClient.shared.fetchChatRooms()
            message = nil
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }
}

private struct StaffChatRoomDetailView: View {
    @EnvironmentObject var app: AppState
    let room: ChatRoomItem
    @State private var messages: [ChatMessageItem] = []
    @State private var loading = false
    @State private var message: String?
    @State private var text = ""
    @State private var sending = false
    @State private var readReceipt: ChatMessagesPayload.ReadReceipt?
    @State private var lastMessageAt: String?
    @State private var pollTask: Task<Void, Never>?
    @State private var pendingNewCount = 0
    @State private var autoScrollNew = true
    @State private var scrollRequestToken = 0
    private let bottomAnchor = "chat-bottom-anchor"

    var body: some View {
        ScrollViewReader { proxy in
            List {
                ForEach(messages) { m in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(m.user.name ?? m.user.email)
                            .font(.caption.bold())
                        Text(m.body ?? "")
                            .font(.subheadline)
                        Text(m.createdAt.replacingOccurrences(of: "T", with: " ").replacingOccurrences(of: "Z", with: ""))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                if let rr = readReceipt {
                    Section {
                        if rr.otherEnabled, let t = rr.otherLastReadAt, !t.isEmpty {
                            Text(I18n.t("chat.readReceipt", app.language) + ": " + t.replacingOccurrences(of: "T", with: " ").replacingOccurrences(of: "Z", with: ""))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        } else if !rr.otherEnabled {
                            Text(I18n.t("chat.readReceiptOff", app.language))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                if pendingNewCount > 0 {
                    Section {
                        Button("\(pendingNewCount) \(I18n.t("chat.newMessages", app.language))") {
                            autoScrollNew = true
                            pendingNewCount = 0
                            requestScrollToBottom()
                        }
                    }
                }
                if let message {
                    Section { Text(message).foregroundStyle(.secondary) }
                }
                Section {
                    Toggle(I18n.t("chat.autoScroll", app.language), isOn: $autoScrollNew)
                    TextField(I18n.t("chat.input", app.language), text: $text, axis: .vertical)
                        .lineLimit(2...4)
                    Button(sending ? I18n.t("chat.sending", app.language) : I18n.t("chat.send", app.language)) {
                        Task { await send() }
                    }
                    .disabled(sending || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    Button(I18n.t("chat.jumpLatest", app.language)) {
                        autoScrollNew = true
                        pendingNewCount = 0
                        requestScrollToBottom()
                    }
                }
                Color.clear
                    .frame(height: 1)
                    .listRowInsets(EdgeInsets())
                    .id(bottomAnchor)
            }
            .overlay { if loading { ProgressView() } }
            .navigationTitle(room.name)
            .task {
                await load()
                requestScrollToBottom()
                startPolling()
            }
            .onDisappear {
                pollTask?.cancel()
                pollTask = nil
            }
            .onChange(of: scrollRequestToken) { _ in
                withAnimation(.easeInOut(duration: 0.2)) {
                    proxy.scrollTo(bottomAnchor, anchor: .bottom)
                }
            }
            .refreshable { await load() }
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let payload = try await APIClient.shared.fetchChatMessages(roomId: room.id)
            messages = payload.messages
            readReceipt = payload.readReceipt
            lastMessageAt = messages.last?.createdAt
            pendingNewCount = 0
            message = nil
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func send() async {
        let body = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return }
        sending = true
        defer { sending = false }
        do {
            try await APIClient.shared.sendChatMessage(roomId: room.id, body: body)
            text = ""
            autoScrollNew = true
            pendingNewCount = 0
            await pollIncremental(forceFullOnEmpty: true)
            requestScrollToBottom()
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func startPolling() {
        pollTask?.cancel()
        pollTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                if Task.isCancelled { break }
                await pollIncremental(forceFullOnEmpty: false)
            }
        }
    }

    private func pollIncremental(forceFullOnEmpty: Bool) async {
        do {
            if let after = lastMessageAt, !after.isEmpty {
                let payload = try await APIClient.shared.fetchChatMessages(roomId: room.id, after: after, limit: 100)
                readReceipt = payload.readReceipt
                if !payload.messages.isEmpty {
                    let existing = Set(messages.map(\.id))
                    let merged = payload.messages.filter { !existing.contains($0.id) }
                    if !merged.isEmpty {
                        messages.append(contentsOf: merged)
                        lastMessageAt = messages.last?.createdAt
                        if autoScrollNew {
                            pendingNewCount = 0
                            requestScrollToBottom()
                        } else {
                            pendingNewCount += merged.count
                        }
                    }
                }
            } else if forceFullOnEmpty {
                await load()
            } else {
                let payload = try await APIClient.shared.fetchChatMessages(roomId: room.id, limit: 60)
                messages = payload.messages
                readReceipt = payload.readReceipt
                lastMessageAt = messages.last?.createdAt
            }
        } catch {
            // keep silent on polling failures
        }
    }

    private func requestScrollToBottom() {
        scrollRequestToken += 1
    }
}
