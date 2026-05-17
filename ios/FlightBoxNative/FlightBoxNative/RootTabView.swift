import SwiftUI
import AVKit

struct RootTabView: View {
    @EnvironmentObject var app: AppState
    @EnvironmentObject var auth: AuthStore
    @State private var unreadNoticeCount: Int = 0

    var body: some View {
        TabView {
            NavigationStack { HomeView() }
                .tabItem { Label(I18n.t("tab.home", app.language), systemImage: "house.fill") }

            NavigationStack { NotificationListView(unreadCount: $unreadNoticeCount) }
                .tabItem { Label(I18n.t("tab.notice", app.language), systemImage: "bell.badge.fill") }
                .badge(unreadNoticeCount)

            NavigationStack { VideoListView() }
                .tabItem { Label(I18n.t("tab.video", app.language), systemImage: "play.rectangle.fill") }

            NavigationStack { ReviewCenterView() }
                .tabItem { Label(I18n.t("tab.review", app.language), systemImage: "checkmark.shield.fill") }

            NavigationStack { UploadPhotoView() }
                .tabItem { Label(I18n.t("tab.upload", app.language), systemImage: "square.and.arrow.up.fill") }

            NavigationStack { MyPhotosView() }
                .tabItem { Label(I18n.t("tab.mine", app.language), systemImage: "photo.stack.fill") }

            NavigationStack { ProfileView() }
                .tabItem { Label(I18n.t("tab.me", app.language), systemImage: "person.crop.circle.fill") }
        }
        .tint(FlightTheme.accent)
        .overlay {
            if app.maintenanceEnabled && (auth.user?.roleId ?? 0) < 2 {
                ZStack {
                    Color.black.opacity(0.55).ignoresSafeArea()
                    VStack(alignment: .leading, spacing: 10) {
                        Text(I18n.t("maintenance.title", app.language))
                            .font(.headline.bold())
                        Text(app.maintenanceMessage.isEmpty ? I18n.t("maintenance.default", app.language) : app.maintenanceMessage)
                            .font(.subheadline)
                        Button(I18n.t("maintenance.refresh", app.language)) {
                            Task { await app.refreshMaintenance() }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding(16)
                    .background(.regularMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .padding(20)
                }
            }
        }
    }
}

private struct ReviewCenterView: View {
    @EnvironmentObject var app: AppState

    var body: some View {
        List {
            Section {
                NavigationLink {
                    ReviewView()
                } label: {
                    Label(I18n.t("review.center.photo", app.language), systemImage: "photo.on.rectangle.angled")
                }
                NavigationLink {
                    VideoReviewView()
                } label: {
                    Label(I18n.t("review.center.video", app.language), systemImage: "play.rectangle.on.rectangle")
                }
            } footer: {
                Text(I18n.t("review.center.hint", app.language))
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(I18n.t("tab.review", app.language))
    }
}

private struct VideoReviewView: View {
    enum ReviewStatusFilter: String, CaseIterable, Identifiable {
        case pending
        case approved
        case rejected
        var id: String { rawValue }
    }
    @EnvironmentObject var app: AppState
    @EnvironmentObject var auth: AuthStore
    @State private var rows: [VideoItem] = []
    @State private var loading = false
    @State private var loadingMore = false
    @State private var message: String?
    @State private var searchText = ""
    @State private var page = 1
    @State private var total = 0
    @State private var selected: VideoItem?
    @State private var qualityScore = 70
    @State private var actionBusy = false
    @State private var statusFilter: ReviewStatusFilter = .pending
    @AppStorage("review.video.autoNext") private var autoNextVideo: Bool = true
    @State private var sessionVideoApprovedCount = 0
    @State private var sessionVideoRejectedCount = 0

    var body: some View {
        Group {
            if (auth.user?.roleId ?? 0) < 2 {
                VStack(spacing: 10) {
                    Text(I18n.t("review.noAccess", app.language))
                        .foregroundStyle(.secondary)
                    LoginView()
                }
                .padding(16)
            } else {
                List {
                    Section {
                        Picker("videoReviewStatus", selection: $statusFilter) {
                            Text(I18n.t("review.video.filter.pending", app.language)).tag(ReviewStatusFilter.pending)
                            Text(I18n.t("review.video.filter.approved", app.language)).tag(ReviewStatusFilter.approved)
                            Text(I18n.t("review.video.filter.rejected", app.language)).tag(ReviewStatusFilter.rejected)
                        }
                        .pickerStyle(.segmented)
                        Toggle(I18n.t("review.video.autoNext", app.language), isOn: $autoNextVideo)
                        HStack {
                            Text("\(I18n.t("review.video.visibleCount", app.language)): \(rows.count)")
                            Spacer()
                            Text("\(I18n.t("review.video.total", app.language)): \(total)")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        HStack {
                            Text("\(I18n.t("review.video.sessionApproved", app.language)): \(sessionVideoApprovedCount)")
                            Spacer()
                            Text("\(I18n.t("review.video.sessionRejected", app.language)): \(sessionVideoRejectedCount)")
                            Spacer()
                            Text("\(I18n.t("review.video.sessionTotal", app.language)): \(sessionVideoApprovedCount + sessionVideoRejectedCount)")
                        }
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        HStack {
                            Button(I18n.t("review.video.sessionReset", app.language), role: .destructive) {
                                sessionVideoApprovedCount = 0
                                sessionVideoRejectedCount = 0
                            }
                            .buttonStyle(.bordered)
                            .disabled((sessionVideoApprovedCount + sessionVideoRejectedCount) == 0)
                            Spacer()
                        }
                    }
                    if let message {
                        Section {
                            Text(message).foregroundStyle(.secondary)
                        }
                    }
                    ForEach(rows) { video in
                        Button {
                            qualityScore = 70
                            selected = video
                        } label: {
                            HStack(alignment: .top, spacing: 10) {
                                videoThumb(video)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(video.account.nickname)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    Text(video.description)
                                        .font(.subheadline)
                                        .lineLimit(2)
                                    if let location = video.location, !location.isEmpty {
                                        Text(location)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                    Text(video.type == "image" ? I18n.t("review.video.typeImage", app.language) : I18n.t("review.video.typeVideo", app.language))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                    Text(I18n.status(video.status, app.language))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption.bold())
                                    .foregroundStyle(.tertiary)
                            }
                        }
                        .buttonStyle(.plain)
                        .swipeActions(edge: .leading, allowsFullSwipe: true) {
                            if statusFilter == .pending && (video.status ?? "pending").lowercased() == "pending" {
                                Button(I18n.t("review.quickApprove", app.language)) {
                                    qualityScore = 70
                                    Task { await submit(video: video, decision: "approved") }
                                }
                                .tint(.green)
                            }
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            if statusFilter == .pending && (video.status ?? "pending").lowercased() == "pending" {
                                Button(I18n.t("review.quickReject", app.language), role: .destructive) {
                                    qualityScore = 70
                                    Task { await submit(video: video, decision: "rejected") }
                                }
                            }
                        }
                    }
                    if rows.count < total {
                        Section {
                            Button(loadingMore ? I18n.t("common.loading", app.language) : I18n.t("review.video.loadMore", app.language)) {
                                Task { await loadMore() }
                            }
                            .disabled(loadingMore)
                        }
                    }
                }
                .overlay { if loading { ProgressView() } }
            }
        }
        .navigationTitle(I18n.t("review.center.video", app.language))
        .searchable(text: $searchText, prompt: Text(I18n.t("review.video.search", app.language)))
        .onSubmit(of: .search) { Task { await reload() } }
        .onChange(of: statusFilter) { _ in Task { await reload() } }
        .onChange(of: searchText) { _ in
            if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Task { await reload() }
            }
        }
        .task { await reload() }
        .refreshable { await reload() }
        .sheet(item: $selected) { video in
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Button(I18n.t("review.previewPrev", app.language)) {
                                selected = prevVideo(before: video.id)
                            }
                            .buttonStyle(.bordered)
                            .disabled(prevVideo(before: video.id) == nil || actionBusy)
                            Button(I18n.t("review.previewNext", app.language)) {
                                selected = nextVideo(after: video.id)
                            }
                            .buttonStyle(.bordered)
                            .disabled(nextVideo(after: video.id) == nil || actionBusy)
                            Spacer()
                            Text("\(I18n.t("review.video.queueProgress", app.language)): \(videoQueueProgressText(video.id))")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        videoPreview(video)
                        Text(video.description)
                            .font(.body)
                        if let location = video.location, !location.isEmpty {
                            Text(location)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if let rp = video.relatedPhoto {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(I18n.t("review.video.relatedPhoto", app.language))
                                    .font(.caption.bold())
                                    .foregroundStyle(.secondary)
                                Text(rp.title ?? rp.registration)
                                    .font(.subheadline.bold())
                                Text("\(rp.registration) · \(rp.aircraftModel ?? "-")")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                NavigationLink(I18n.t("review.video.openPhoto", app.language)) {
                                    PhotoDetailView(photo: Photo(
                                        id: rp.id,
                                        title: rp.title,
                                        registration: rp.registration,
                                        airline: rp.airline,
                                        aircraftModel: rp.aircraftModel,
                                        shotAirport: rp.shotAirport,
                                        status: "approved",
                                        hot: nil
                                    ))
                                }
                                .buttonStyle(.bordered)
                            }
                            .padding(10)
                            .background(Color(.secondarySystemBackground).opacity(0.7))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        HStack {
                            Text(I18n.t("review.video.score", app.language))
                                .font(.caption.bold())
                            Spacer()
                            Text("\(qualityScore)")
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(.secondary)
                        }
                        Slider(value: Binding(
                            get: { Double(qualityScore) },
                            set: { qualityScore = Int($0.rounded()) }
                        ), in: 0...100, step: 1)
                        if (video.status ?? "pending").lowercased() == "pending" && statusFilter == .pending {
                            HStack {
                                Button(I18n.t("review.reject", app.language), role: .destructive) {
                                    Task { await submit(video: video, decision: "rejected") }
                                }
                                .buttonStyle(.bordered)
                                .disabled(actionBusy)
                                Spacer()
                                Button(I18n.t("review.approve", app.language)) {
                                    Task { await submit(video: video, decision: "approved") }
                                }
                                .buttonStyle(.borderedProminent)
                                .disabled(actionBusy)
                            }
                        } else {
                            Text("\(I18n.t("review.video.currentStatus", app.language)): \(I18n.status(video.status, app.language))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(12)
                }
                .navigationTitle(I18n.t("review.video.detail", app.language))
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(I18n.t("common.close", app.language)) { selected = nil }
                    }
                }
            }
            .presentationDetents([.medium, .large])
        }
    }

    @ViewBuilder
    private func videoPreview(_ video: VideoItem) -> some View {
        if video.type == "video", let vp = video.videoPath, !vp.isEmpty {
            VideoPlayer(player: AVPlayer(url: APIClient.shared.videoAssetURL(path: vp)))
                .frame(height: 230)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        } else {
            let paths = parseImagePaths(video.imagePathsJson ?? "")
            if paths.isEmpty {
                Rectangle().fill(Color.gray.opacity(0.2)).frame(height: 220)
            } else {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
                    ForEach(paths.prefix(9), id: \.self) { p in
                        AsyncImage(url: APIClient.shared.videoAssetURL(path: p)) { img in
                            img.resizable().scaledToFill()
                        } placeholder: {
                            Color.gray.opacity(0.2)
                        }
                        .frame(height: 95)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func videoThumb(_ video: VideoItem) -> some View {
        let thumb = thumbURL(video)
        AsyncImage(url: thumb) { img in
            img.resizable().scaledToFill()
        } placeholder: {
            Color.gray.opacity(0.2)
        }
        .frame(width: 118, height: 88)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(Color.white.opacity(0.4), lineWidth: 1)
        )
    }

    private func thumbURL(_ video: VideoItem) -> URL? {
        if let t = video.thumbnailPath, !t.isEmpty {
            return APIClient.shared.videoAssetURL(path: t)
        }
        if video.type == "image", let raw = video.imagePathsJson, let first = parseImagePaths(raw).first {
            return APIClient.shared.videoAssetURL(path: first)
        }
        return nil
    }

    private func parseImagePaths(_ raw: String) -> [String] {
        guard let data = raw.data(using: .utf8) else { return [] }
        let arr = (try? JSONDecoder().decode([String].self, from: data)) ?? []
        return arr.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    private func reload() async {
        page = 1
        await load(page: 1, append: false)
    }

    private func loadMore() async {
        guard !loadingMore else { return }
        let next = page + 1
        await load(page: next, append: true)
    }

    private func load(page targetPage: Int, append: Bool) async {
        if append { loadingMore = true } else { loading = true }
        defer {
            loading = false
            loadingMore = false
        }
        do {
            let response = try await APIClient.shared.fetchAdminVideoReviewQueue(
                status: statusFilter.rawValue,
                query: searchText.trimmingCharacters(in: .whitespacesAndNewlines),
                page: targetPage,
                limit: 20
            )
            if append {
                rows.append(contentsOf: response.videos)
            } else {
                rows = response.videos
            }
            page = response.page
            total = response.total
            message = rows.isEmpty ? I18n.t("review.queueEmpty", app.language) : nil
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func submit(video: VideoItem, decision: String) async {
        actionBusy = true
        defer { actionBusy = false }
        let next = autoNextVideo ? nextVideoAfterCurrent(video.id) : nil
        do {
            try await APIClient.shared.reviewVideo(videoId: video.id, decision: decision, qualityScore: qualityScore)
            rows.removeAll { $0.id == video.id }
            total = max(0, total - 1)
            if decision == "approved" {
                sessionVideoApprovedCount += 1
            } else if decision == "rejected" {
                sessionVideoRejectedCount += 1
            }
            selected = next
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }

    private func nextVideoAfterCurrent(_ id: String) -> VideoItem? {
        guard !rows.isEmpty else { return nil }
        guard let idx = rows.firstIndex(where: { $0.id == id }) else { return nil }
        let nextIdx = idx + 1
        if rows.indices.contains(nextIdx) { return rows[nextIdx] }
        if idx > 0 { return rows[idx - 1] }
        return nil
    }

    private func nextVideo(after id: String) -> VideoItem? {
        guard let idx = rows.firstIndex(where: { $0.id == id }) else { return nil }
        let nextIdx = idx + 1
        if rows.indices.contains(nextIdx) { return rows[nextIdx] }
        return nil
    }

    private func prevVideo(before id: String) -> VideoItem? {
        guard let idx = rows.firstIndex(where: { $0.id == id }), idx > 0 else { return nil }
        return rows[idx - 1]
    }

    private func videoQueueProgressText(_ id: String) -> String {
        guard let idx = rows.firstIndex(where: { $0.id == id }) else { return "-" }
        return "\(idx + 1)/\(rows.count)"
    }
}

private struct NotificationListView: View {
    @EnvironmentObject var app: AppState
    @EnvironmentObject var auth: AuthStore
    @Binding var unreadCount: Int
    @State private var items: [AppNotificationItem] = []
    @State private var loading = false
    @State private var message: String?
    @State private var noticeFilter = "all"
    @State private var unreadOnly = false

    var body: some View {
        List {
            if auth.user == nil {
                Section {
                    Text(I18n.t("notice.loginHint", app.language))
                        .foregroundStyle(.secondary)
                }
            } else {
                Section {
                    Picker("noticeFilter", selection: $noticeFilter) {
                        Text(I18n.t("notice.filter.all", app.language)).tag("all")
                        Text(I18n.t("notice.filter.review", app.language)).tag("review")
                        Text(I18n.t("notice.filter.security", app.language)).tag("security")
                        Text(I18n.t("notice.filter.system", app.language)).tag("system")
                    }
                    .pickerStyle(.segmented)
                    Toggle(I18n.t("notice.onlyUnread", app.language), isOn: $unreadOnly)
                }
            }
            if auth.user != nil && items.isEmpty && !loading {
                Section {
                    Text(message ?? I18n.t("notice.empty", app.language))
                        .foregroundStyle(.secondary)
                }
            } else if auth.user != nil {
                ForEach(items) { item in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(item.title).font(.subheadline.bold())
                            Spacer()
                            if item.unread {
                                Circle().fill(Color.red).frame(width: 8, height: 8)
                            }
                        }
                        Text(item.body)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        Text(item.createdAt.replacingOccurrences(of: "T", with: " ").replacingOccurrences(of: "Z", with: ""))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                    .swipeActions {
                        if item.unread {
                            Button(I18n.t("notice.markRead", app.language)) {
                                Task { await markRead(item.id) }
                            }
                            .tint(.blue)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(I18n.t("notice.title", app.language))
        .toolbar {
            if auth.user != nil {
                Button(I18n.t("notice.markAllRead", app.language)) {
                    Task { await markAllRead() }
                }
                .disabled(loading || unreadCount < 1)
            }
        }
        .overlay { if loading { ProgressView() } }
        .task { await load() }
        .refreshable { await load() }
        .onChange(of: noticeFilter) { _ in Task { await load() } }
        .onChange(of: unreadOnly) { _ in Task { await load() } }
        .onChange(of: auth.user?.id) { _ in
            Task {
                if auth.user == nil {
                    items = []
                    unreadCount = 0
                } else {
                    await load()
                }
            }
        }
    }

    private func load() async {
        guard auth.user != nil else {
            unreadCount = 0
            return
        }
        loading = true
        defer { loading = false }
        do {
            let result = try await APIClient.shared.fetchNotifications(filter: noticeFilter, unreadOnly: unreadOnly)
            items = result.items
            unreadCount = result.unreadCount
            message = nil
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func markRead(_ id: String) async {
        do {
            try await APIClient.shared.markNotificationRead(id: id)
            if let idx = items.firstIndex(where: { $0.id == id }) {
                let old = items[idx]
                items[idx] = AppNotificationItem(
                    id: old.id,
                    title: old.title,
                    body: old.body,
                    type: old.type,
                    createdAt: old.createdAt,
                    unread: false,
                    source: old.source
                )
            }
            if unreadCount > 0 { unreadCount -= 1 }
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func markAllRead() async {
        do {
            try await APIClient.shared.markAllNotificationsRead()
            unreadCount = 0
            items = items.map { item in
                AppNotificationItem(
                    id: item.id,
                    title: item.title,
                    body: item.body,
                    type: item.type,
                    createdAt: item.createdAt,
                    unread: false,
                    source: item.source
                )
            }
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }
}

private struct VideoListView: View {
    @EnvironmentObject var app: AppState
    @State private var items: [VideoItem] = []
    @State private var loading = false
    @State private var loadingMore = false
    @State private var nextCursor: String?
    @State private var filter: String = "recommended"
    @State private var message: String?

    var body: some View {
        List {
            Section {
                Picker("videoFilter", selection: $filter) {
                    Text(I18n.t("video.filter.recommended", app.language)).tag("recommended")
                    Text(I18n.t("video.filter.latest", app.language)).tag("latest")
                }
                .pickerStyle(.segmented)
            }
            if items.isEmpty && !loading {
                Section {
                    Text(message ?? I18n.t("video.empty", app.language))
                        .foregroundStyle(.secondary)
                }
            }
            ForEach(items) { video in
                NavigationLink {
                    VideoInteractiveDetailView(videoId: video.id)
                } label: {
                    HStack(alignment: .top, spacing: 10) {
                        AsyncImage(url: thumbURL(video: video)) { img in
                            img.resizable().scaledToFill()
                        } placeholder: {
                            Color.gray.opacity(0.2)
                        }
                        .frame(width: 120, height: 78)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        VStack(alignment: .leading, spacing: 4) {
                            Text(video.account.nickname).font(.caption).foregroundStyle(.secondary)
                            Text(video.description)
                                .font(.subheadline)
                                .lineLimit(2)
                            Text("\(video.viewCount) \(I18n.t("video.views", app.language))")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            if nextCursor != nil {
                Section {
                    Button(loadingMore ? I18n.t("common.loading", app.language) : I18n.t("video.loadMore", app.language)) {
                        Task { await loadMore() }
                    }
                    .disabled(loadingMore)
                }
            } else if !items.isEmpty {
                Section {
                    Text(I18n.t("video.noMore", app.language))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(I18n.t("video.title", app.language))
        .overlay { if loading { ProgressView() } }
        .task { await load(reset: true) }
        .refreshable { await load(reset: true) }
        .onChange(of: filter) { _ in
            Task { await load(reset: true) }
        }
    }

    private func thumbURL(video: VideoItem) -> URL? {
        if let t = video.thumbnailPath, !t.isEmpty {
            return APIClient.shared.videoAssetURL(path: t)
        }
        if video.type == "image", let raw = video.imagePathsJson, let first = parseImagePaths(raw).first {
            return APIClient.shared.videoAssetURL(path: first)
        }
        return nil
    }

    private func parseImagePaths(_ raw: String) -> [String] {
        guard let data = raw.data(using: .utf8) else { return [] }
        let arr = (try? JSONDecoder().decode([String].self, from: data)) ?? []
        return arr.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    private func load(reset: Bool) async {
        if reset { loading = true } else { loadingMore = true }
        defer {
            loading = false
            loadingMore = false
        }
        do {
            let response = try await APIClient.shared.fetchVideos(limit: 12, cursor: reset ? nil : nextCursor, filter: filter)
            if reset {
                items = response.videos
            } else {
                items.append(contentsOf: response.videos)
            }
            nextCursor = response.nextCursor
            message = nil
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func loadMore() async {
        guard nextCursor != nil else { return }
        await load(reset: false)
    }
}

private struct VideoDetailView: View {
    @EnvironmentObject var app: AppState
    let videoId: String
    @State private var video: VideoItem?
    @State private var loading = false
    @State private var message: String?

    var body: some View {
        ScrollView {
            if let video {
                VStack(alignment: .leading, spacing: 12) {
                    if video.type == "video", let vp = video.videoPath, !vp.isEmpty {
                        VideoPlayer(player: AVPlayer(url: APIClient.shared.videoAssetURL(path: vp)))
                            .frame(height: 260)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    } else {
                        imageGrid(video: video)
                    }
                    GlassCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(video.description).font(.body)
                            Text(video.location ?? "-")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("\(video.viewCount) \(I18n.t("video.views", app.language))")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    if let rp = video.relatedPhoto {
                        GlassCard {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(I18n.t("video.relatedPhoto", app.language))
                                    .font(.caption.bold())
                                    .foregroundStyle(.secondary)
                                Text(rp.title ?? rp.registration).font(.subheadline.bold())
                                Text("\(rp.registration) · \(rp.aircraftModel ?? "-")")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .padding(12)
            } else if let message {
                Text(message).foregroundStyle(.secondary).padding()
            }
        }
        .navigationTitle(I18n.t("tab.video", app.language))
        .overlay { if loading { ProgressView() } }
        .task { await load() }
    }

    @ViewBuilder
    private func imageGrid(video: VideoItem) -> some View {
        let paths = parseImagePaths(video.imagePathsJson ?? "")
        if paths.isEmpty {
            Rectangle().fill(Color.gray.opacity(0.2)).frame(height: 220)
        } else {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
                ForEach(paths, id: \.self) { p in
                    AsyncImage(url: APIClient.shared.videoAssetURL(path: p)) { img in
                        img.resizable().scaledToFill()
                    } placeholder: {
                        Color.gray.opacity(0.2)
                    }
                    .frame(height: 95)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
            }
        }
    }

    private func parseImagePaths(_ raw: String) -> [String] {
        guard let data = raw.data(using: .utf8) else { return [] }
        let arr = (try? JSONDecoder().decode([String].self, from: data)) ?? []
        return arr.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            video = try await APIClient.shared.fetchVideoDetail(videoId: videoId)
            message = nil
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }
}
