import SwiftUI
import UIKit

private struct SessionActionLog: Identifiable {
    let id = UUID()
    let kind: String // approve | reject
    let photoId: String
    let label: String
    let reason: String?
    let at: Date
}

private struct ExposureStats {
    let averageLuma: Double
    let highlightRatio: Double
    let shadowRatio: Double
}

struct ReviewView: View {
    enum QueueFilter: String, CaseIterable, Identifiable {
        case all
        case mine
        case unassigned
        var id: String { rawValue }
    }

    @EnvironmentObject var app: AppState

    
    @EnvironmentObject var auth: AuthStore
    @State private var photos: [ReviewQueueItem] = []
    @State private var loading = false
    @State private var message: String?
    @State private var rejectDraft: [String: String] = [:]
    @State private var actionLoadingId: String?
    @State private var weakConfirmPhotoId: String?
    @State private var weakConfirmWarning: String?
    @State private var weakConfirmOpenNext = false
    @State private var transferNote: [String: String] = [:]
    @State private var queueFilter: QueueFilter = .all
    @State private var previewingPhoto: ReviewQueueItem?
    @State private var searchText: String = ""
    @State private var toastText: String?
    @State private var toastError = false
    @State private var toastTask: Task<Void, Never>?
    @State private var sessionApprovedCount = 0
    @State private var sessionRejectedCount = 0
    @State private var sessionActions: [SessionActionLog] = []
    @AppStorage("review.autoNext") private var autoNext: Bool = true

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
                        Picker("queueFilter", selection: $queueFilter) {
                            Text(I18n.t("review.filterAll", app.language)).tag(QueueFilter.all)
                            Text(I18n.t("review.filterMine", app.language)).tag(QueueFilter.mine)
                            Text(I18n.t("review.filterUnassigned", app.language)).tag(QueueFilter.unassigned)
                        }
                        .pickerStyle(.segmented)
                        HStack {
                            Text("\(I18n.t("review.totalCount", app.language)): \(photos.count)")
                            Spacer()
                            Text("\(I18n.t("review.visibleCount", app.language)): \(filteredPhotos.count)")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        HStack {
                            Text("\(I18n.t("review.sessionApproved", app.language)): \(sessionApprovedCount)")
                            Spacer()
                            Text("\(I18n.t("review.sessionRejected", app.language)): \(sessionRejectedCount)")
                            Spacer()
                            Text("\(I18n.t("review.sessionTotal", app.language)): \(sessionApprovedCount + sessionRejectedCount)")
                        }
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        VStack(alignment: .leading, spacing: 6) {
                            Text(I18n.t("review.sessionPanel", app.language))
                                .font(.caption.bold())
                            HStack {
                                Text(I18n.t("review.sessionReasonRank", app.language) + ":")
                                if topRejectReasonStats.isEmpty {
                                    Text(I18n.t("review.none", app.language))
                                } else {
                                    Text(topRejectReasonStats.prefix(3).map { "\($0.reason)×\($0.count)" }.joined(separator: " / "))
                                }
                            }
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            HStack {
                                Text(I18n.t("review.sessionHourly", app.language) + ":")
                                if hourlyStats.isEmpty {
                                    Text(I18n.t("review.none", app.language))
                                } else {
                                    Text(hourlyStats.map { String(format: "%02d:00×%d", $0.hour, $0.count) }.joined(separator: " / "))
                                }
                            }
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            HStack {
                                Button(I18n.t("review.sessionCopy", app.language)) {
                                    copySessionReport()
                                }
                                .buttonStyle(.bordered)
                                .disabled(sessionActions.isEmpty)
                                Button(I18n.t("review.sessionReset", app.language), role: .destructive) {
                                    resetSessionReport()
                                }
                                .buttonStyle(.bordered)
                                .disabled(sessionActions.isEmpty)
                            }
                        }
                    }
                    if let message {
                        Section { Text(message).foregroundStyle(.secondary) }
                    }
                    ForEach(filteredPhotos) { photo in
                        HStack(alignment: .top, spacing: 10) {
                            reviewThumb(photo.id)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(photo.title ?? photo.registration).font(.headline)
                                Text("\(photo.registration) · \(photo.airline)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(photo.user.name ?? photo.user.email)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                if let assigned = photo.assignedReviewer {
                                    Text("\(I18n.t("review.assignedTo", app.language)): \(assigned.name ?? assigned.email)")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                } else {
                                    Text(I18n.t("review.unassigned", app.language))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption.bold())
                                .foregroundStyle(.tertiary)
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { previewingPhoto = photo }
                        .swipeActions(edge: .leading, allowsFullSwipe: true) {
                            Button(I18n.t("review.quickApprove", app.language)) {
                                Task { await approve(photo.id, openNext: true) }
                            }
                            .tint(.green)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(I18n.t("review.quickReject", app.language), role: .destructive) {
                                Task {
                                    if (rejectDraft[photo.id] ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                        rejectDraft[photo.id] = I18n.t("review.reason.soft", app.language)
                                    }
                                    await reject(photo.id, openNext: true)
                                }
                            }
                        }
                    }
                }
                .overlay { if loading { ProgressView() } }
            }
        }
        .navigationTitle(I18n.t("tab.review", app.language))
        .searchable(text: $searchText, prompt: Text(I18n.t("review.searchPrompt", app.language)))
        .task { await load() }
        .refreshable { await load() }
        .onChange(of: queueFilter) { _ in
            handleFilterChanged()
        }
        .onChange(of: searchText) { _ in
            handleFilterChanged()
        }
        .alert(I18n.t("common.confirm", app.language), isPresented: Binding(get: { weakConfirmPhotoId != nil }, set: {
            if !$0 {
                weakConfirmPhotoId = nil
                weakConfirmOpenNext = false
            }
        })) {
            Button(I18n.t("common.cancel", app.language), role: .cancel) {
                weakConfirmPhotoId = nil
                weakConfirmOpenNext = false
            }
            Button(I18n.t("common.continue", app.language), role: .destructive) {
                if let id = weakConfirmPhotoId {
                    Task { await forceReject(id) }
                }
            }
        } message: {
            Text(weakConfirmWarning ?? I18n.t("review.confirmWeak", app.language))
        }
        .sheet(item: $previewingPhoto) { photo in
            ReviewPreviewSheet(
                photo: photo,
                canHot: (auth.user?.roleId ?? 0) >= 3,
                isBusy: actionLoadingId == photo.id,
                rejectReason: Binding(
                    get: { rejectDraft[photo.id] ?? "" },
                    set: { rejectDraft[photo.id] = $0 }
                ),
                transferReason: Binding(
                    get: { transferNote[photo.id] ?? "" },
                    set: { transferNote[photo.id] = $0 }
                ),
                onAssignToMe: { Task { await assignToMe(photo.id) } },
                onTransfer: { Task { await transfer(photo.id) } },
                onApprove: { next in Task { await approve(photo.id, openNext: next) } },
                onReject: { next in Task { await reject(photo.id, openNext: next) } },
                onToggleHot: { hot in Task { await toggleHot(photo.id, hot) } },
                autoNext: Binding(get: { autoNext }, set: { autoNext = $0 }),
                queueProgress: queueProgressText(photo.id),
                hasPrev: prevPhoto(before: photo.id) != nil,
                hasNext: nextPhoto(after: photo.id) != nil,
                onPrev: { previewingPhoto = prevPhoto(before: photo.id) },
                onNext: { previewingPhoto = nextPhoto(after: photo.id) }
            )
        }
        .overlay(alignment: .top) {
            if let toastText {
                Text(toastText)
                    .font(.subheadline.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(toastError ? Color.red.opacity(0.92) : Color.green.opacity(0.92))
                    .clipShape(Capsule())
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            photos = try await APIClient.shared.fetchReviewQueue()
            syncPreviewPhoto()
            message = filteredPhotos.isEmpty ? I18n.t("review.queueEmpty", app.language) : nil
        } catch {
            let raw = error.localizedDescription
            message = raw.hasPrefix("HTTP") ? I18n.t("review.needLoginHint", app.language) : I18n.error(raw, app.language)
        }
    }

    private var filteredPhotos: [ReviewQueueItem] {
        let scoped: [ReviewQueueItem]
        switch queueFilter {
        case .all:
            scoped = photos
        case .mine:
            guard let myId = auth.user?.id else { return [] }
            scoped = photos.filter { $0.assignedReviewerId == myId }
        case .unassigned:
            scoped = photos.filter { ($0.assignedReviewerId ?? "").isEmpty }
        }
        let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return scoped }
        return scoped.filter { p in
            let t = (p.title ?? "").lowercased()
            let reg = p.registration.lowercased()
            let user = (p.user.name ?? p.user.email).lowercased()
            return t.contains(q) || reg.contains(q) || user.contains(q)
        }
    }

    private func reviewThumb(_ photoId: String) -> some View {
        AsyncImage(url: APIClient.shared.imageURL(photoId: photoId, variant: "thumb")) { image in
            image.resizable().scaledToFill()
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

    private func approve(_ id: String, openNext: Bool = false) async {
        actionLoadingId = id
        defer { actionLoadingId = nil }
        let next = openNext ? nextPhoto(after: id) : nil
        let label = actionPhotoLabel(id)
        do {
            try await APIClient.shared.reviewApprove(photoId: id)
            photos.removeAll { $0.id == id }
            if openNext {
                previewingPhoto = next
            } else if previewingPhoto?.id == id {
                previewingPhoto = nil
            }
            sessionApprovedCount += 1
            appendSessionAction(kind: "approve", photoId: id, label: label, reason: nil)
            showToast(I18n.t("review.toast.approved", app.language), isError: false)
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
            showToast(message ?? I18n.error(error.localizedDescription, app.language), isError: true)
        }
    }

    private func assignToMe(_ id: String) async {
        actionLoadingId = id
        defer { actionLoadingId = nil }
        do {
            try await APIClient.shared.reviewAssignToMe(photoId: id)
            await load()
            syncPreviewPhoto()
            showToast(I18n.t("review.toast.assigned", app.language), isError: false)
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
            showToast(message ?? I18n.error(error.localizedDescription, app.language), isError: true)
        }
    }

    private func transfer(_ id: String) async {
        actionLoadingId = id
        defer { actionLoadingId = nil }
        do {
            try await APIClient.shared.reviewTransfer(photoId: id, staffNote: transferNote[id] ?? "")
            await load()
            syncPreviewPhoto()
            showToast(I18n.t("review.toast.transferred", app.language), isError: false)
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
            showToast(message ?? I18n.error(error.localizedDescription, app.language), isError: true)
        }
    }

    private func reject(_ id: String, openNext: Bool = false) async {
        actionLoadingId = id
        defer { actionLoadingId = nil }
        let reason = (rejectDraft[id] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !reason.isEmpty else {
            message = I18n.t("review.rejectReason", app.language)
            return
        }
        let next = openNext ? nextPhoto(after: id) : nil
        let label = actionPhotoLabel(id)
        do {
            let r = try await APIClient.shared.reviewReject(photoId: id, reason: reason, forceConfirm: false)
            if r.requiresConfirm {
                weakConfirmPhotoId = id
                weakConfirmWarning = r.warning
                weakConfirmOpenNext = openNext
                return
            }
            photos.removeAll { $0.id == id }
            if openNext {
                previewingPhoto = next
            } else if previewingPhoto?.id == id {
                previewingPhoto = nil
            }
            sessionRejectedCount += 1
            appendSessionAction(kind: "reject", photoId: id, label: label, reason: reason)
            showToast(I18n.t("review.toast.rejected", app.language), isError: false)
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
            showToast(message ?? I18n.error(error.localizedDescription, app.language), isError: true)
        }
    }

    private func forceReject(_ id: String) async {
        actionLoadingId = id
        defer { actionLoadingId = nil }
        weakConfirmPhotoId = nil
        let reason = (rejectDraft[id] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let shouldOpenNext = weakConfirmOpenNext
        let next = shouldOpenNext ? nextPhoto(after: id) : nil
        let label = actionPhotoLabel(id)
        weakConfirmOpenNext = false
        do {
            _ = try await APIClient.shared.reviewReject(photoId: id, reason: reason, forceConfirm: true)
            photos.removeAll { $0.id == id }
            if shouldOpenNext {
                previewingPhoto = next
            } else if previewingPhoto?.id == id {
                previewingPhoto = nil
            }
            sessionRejectedCount += 1
            appendSessionAction(kind: "reject", photoId: id, label: label, reason: reason)
            showToast(I18n.t("review.toast.rejected", app.language), isError: false)
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
            showToast(message ?? I18n.error(error.localizedDescription, app.language), isError: true)
        }
    }

    private func toggleHot(_ id: String, _ hot: Bool) async {
        actionLoadingId = id
        defer { actionLoadingId = nil }
        do {
            _ = try await APIClient.shared.toggleHot(photoId: id, hot: hot)
            if let idx = photos.firstIndex(where: { $0.id == id }) {
                let old = photos[idx]
                let updated = ReviewQueueItem(
                    id: old.id,
                    title: old.title,
                    registration: old.registration,
                    airline: old.airline,
                    aircraftModel: old.aircraftModel,
                    shotAirport: old.shotAirport,
                    hot: hot,
                    assignedReviewerId: old.assignedReviewerId,
                    firstReviewDecision: old.firstReviewDecision,
                    categoriesJson: old.categoriesJson,
                    user: old.user,
                    assignedReviewer: old.assignedReviewer
                )
                photos[idx] = updated
                if previewingPhoto?.id == id {
                    previewingPhoto = updated
                }
            }
            showToast(I18n.t("review.toast.hotUpdated", app.language), isError: false)
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
            showToast(message ?? I18n.error(error.localizedDescription, app.language), isError: true)
        }
    }

    private func nextPhoto(after id: String) -> ReviewQueueItem? {
        let rows = filteredPhotos
        guard let idx = rows.firstIndex(where: { $0.id == id }) else { return nil }
        let nextIdx = idx + 1
        if rows.indices.contains(nextIdx) { return rows[nextIdx] }
        return nil
    }

    private func syncPreviewPhoto() {
        guard let current = previewingPhoto else { return }
        previewingPhoto = photos.first(where: { $0.id == current.id })
    }

    private func prevPhoto(before id: String) -> ReviewQueueItem? {
        let rows = filteredPhotos
        guard let idx = rows.firstIndex(where: { $0.id == id }), idx > 0 else { return nil }
        return rows[idx - 1]
    }

    private func handleFilterChanged() {
        if filteredPhotos.isEmpty {
            message = I18n.t("review.queueEmpty", app.language)
        } else {
            if let current = previewingPhoto, !filteredPhotos.contains(where: { $0.id == current.id }) {
                previewingPhoto = filteredPhotos.first
                message = I18n.t("review.previewMoved", app.language)
                return
            }
            message = nil
        }
    }

    private func queueProgressText(_ id: String) -> String {
        let rows = filteredPhotos
        guard let idx = rows.firstIndex(where: { $0.id == id }) else { return "-" }
        return "\(idx + 1)/\(rows.count)"
    }

    private var topRejectReasonStats: [(reason: String, count: Int)] {
        var map: [String: Int] = [:]
        for item in sessionActions where item.kind == "reject" {
            let r = (item.reason ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if r.isEmpty { continue }
            map[r, default: 0] += 1
        }
        return map.map { ($0.key, $0.value) }.sorted { a, b in
            if a.count == b.count { return a.reason < b.reason }
            return a.count > b.count
        }
    }

    private var hourlyStats: [(hour: Int, count: Int)] {
        var map: [Int: Int] = [:]
        let cal = Calendar.current
        for item in sessionActions {
            let hour = cal.component(.hour, from: item.at)
            map[hour, default: 0] += 1
        }
        return map.map { ($0.key, $0.value) }.sorted { $0.hour < $1.hour }
    }

    private func copySessionReport() {
        var lines: [String] = []
        lines.append("AviSpotters Review Session")
        lines.append("\(I18n.t("review.sessionApproved", app.language)): \(sessionApprovedCount)")
        lines.append("\(I18n.t("review.sessionRejected", app.language)): \(sessionRejectedCount)")
        lines.append("\(I18n.t("review.sessionTotal", app.language)): \(sessionApprovedCount + sessionRejectedCount)")
        if !topRejectReasonStats.isEmpty {
            lines.append("\(I18n.t("review.sessionReasonRank", app.language)):")
            for (idx, row) in topRejectReasonStats.prefix(5).enumerated() {
                lines.append("\(idx + 1). \(row.reason) x\(row.count)")
            }
        }
        if !hourlyStats.isEmpty {
            lines.append("\(I18n.t("review.sessionHourly", app.language)):")
            lines.append(hourlyStats.map { String(format: "%02d:00 x%d", $0.hour, $0.count) }.joined(separator: " / "))
        }
        UIPasteboard.general.string = lines.joined(separator: "\n")
        showToast(I18n.t("review.toast.reportCopied", app.language), isError: false)
    }

    private func resetSessionReport() {
        sessionApprovedCount = 0
        sessionRejectedCount = 0
        sessionActions.removeAll()
        showToast(I18n.t("review.toast.sessionReset", app.language), isError: false)
    }

    private func appendSessionAction(kind: String, photoId: String, label: String, reason: String?) {
        sessionActions.insert(
            SessionActionLog(kind: kind, photoId: photoId, label: label, reason: reason, at: Date()),
            at: 0
        )
        if sessionActions.count > 300 {
            sessionActions = Array(sessionActions.prefix(300))
        }
    }

    private func actionPhotoLabel(_ id: String) -> String {
        guard let p = photos.first(where: { $0.id == id }) else { return id }
        return (p.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? p.registration : (p.title ?? p.registration)
    }

    private func showToast(_ text: String, isError: Bool) {
        toastTask?.cancel()
        toastText = text
        toastError = isError
        if isError {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        } else {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
        toastTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 1_800_000_000)
            withAnimation {
                toastText = nil
            }
        }
    }
}

private struct ReviewPreviewSheet: View {
    enum Variant: String, CaseIterable, Identifiable {
        case display
        case original
        var id: String { rawValue }
    }

    let photo: ReviewQueueItem
    let canHot: Bool
    let isBusy: Bool
    @Binding var rejectReason: String
    @Binding var transferReason: String
    let onAssignToMe: () -> Void
    let onTransfer: () -> Void
    let onApprove: (_ openNext: Bool) -> Void
    let onReject: (_ openNext: Bool) -> Void
    let onToggleHot: (_ hot: Bool) -> Void
    @Binding var autoNext: Bool
    let queueProgress: String
    let hasPrev: Bool
    let hasNext: Bool
    let onPrev: () -> Void
    let onNext: () -> Void
    @EnvironmentObject var app: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var variant: Variant = .display
    @State private var zoom: CGFloat = 1
    @State private var baseZoom: CGFloat = 1
    @State private var hotValue: Bool = false
    @State private var showTools: Bool = true
    @State private var armReject = false
    @State private var armRejectNext = false
    @State private var openQualityGroup = true
    @State private var openCompositionGroup = false
    @State private var openComplianceGroup = false
    @State private var showGrid = true
    @State private var showHorizonGuide = false
    @State private var horizonTilt: Double = 0
    @State private var exposureStats: ExposureStats?
    @State private var exposureLoading = false
    @State private var exposureTask: Task<Void, Never>?
    @AppStorage("review.recentReasons") private var recentReasonsRaw: String = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 10) {
                        Picker("previewVariant", selection: $variant) {
                            Text(I18n.t("review.previewDisplay", app.language)).tag(Variant.display)
                            Text(I18n.t("review.previewOriginal", app.language)).tag(Variant.original)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal, 10)

                        ZStack {
                            AsyncImage(url: APIClient.shared.imageURL(photoId: photo.id, variant: variant.rawValue)) { image in
                                image
                                    .resizable()
                                    .scaledToFit()
                                    .scaleEffect(zoom)
                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                                    .gesture(
                                        MagnificationGesture()
                                            .onChanged { value in
                                                zoom = min(max(baseZoom * value, 1), 6)
                                            }
                                            .onEnded { value in
                                                baseZoom = min(max(baseZoom * value, 1), 6)
                                                zoom = baseZoom
                                            }
                                    )
                                    .onTapGesture(count: 2) {
                                        if zoom > 1 {
                                            zoom = 1
                                            baseZoom = 1
                                        } else {
                                            zoom = 2
                                            baseZoom = 2
                                        }
                                    }
                            } placeholder: {
                                ProgressView().tint(.white)
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)

                            CompositionGuideOverlay(
                                showGrid: showGrid,
                                showHorizonGuide: showHorizonGuide,
                                horizonTilt: horizonTilt
                            )
                            .allowsHitTesting(false)
                        }
                        .padding(.horizontal, 8)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(photo.title ?? photo.registration)
                                .font(.headline)
                            Text("\(photo.registration) · \(photo.airline) · \(photo.aircraftModel)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(photo.shotAirport)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Text(photo.user.name ?? photo.user.email)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        Text("\(I18n.t("review.previewProgress", app.language)): \(queueProgress)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .padding(.horizontal, 10)

                        if showTools {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Button(I18n.t("review.previewPrev", app.language), action: onPrev)
                                        .buttonStyle(.bordered)
                                        .disabled(!hasPrev || isBusy)
                                    Button(I18n.t("review.previewNext", app.language), action: onNext)
                                        .buttonStyle(.bordered)
                                        .disabled(!hasNext || isBusy)
                                    Spacer()
                                }
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(I18n.t("review.tools.overlay", app.language))
                                        .font(.caption.bold())
                                        .foregroundStyle(.secondary)
                                    HStack(spacing: 10) {
                                        Toggle(I18n.t("review.tools.grid", app.language), isOn: $showGrid)
                                            .toggleStyle(.switch)
                                            .disabled(isBusy)
                                        Toggle(I18n.t("review.tools.horizon", app.language), isOn: $showHorizonGuide)
                                            .toggleStyle(.switch)
                                            .disabled(isBusy)
                                    }
                                    if showHorizonGuide {
                                        HStack {
                                            Text(I18n.t("review.tools.horizonTilt", app.language))
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                            Slider(value: $horizonTilt, in: -12...12, step: 0.5)
                                                .disabled(isBusy)
                                            Text(String(format: "%.1f°", horizonTilt))
                                                .font(.caption2.monospacedDigit())
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                }
                                .padding(10)
                                .background(Color(.secondarySystemBackground).opacity(0.75))
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(I18n.t("review.tools.exposure", app.language))
                                        .font(.caption.bold())
                                        .foregroundStyle(.secondary)
                                    if exposureLoading {
                                        Text(I18n.t("review.tools.exposureChecking", app.language))
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    } else if let stats = exposureStats {
                                        Text(exposureLevelText(stats))
                                            .font(.caption2)
                                            .foregroundStyle(.primary)
                                        HStack {
                                            Text("\(I18n.t("review.tools.highlightClip", app.language)): \(Int(stats.highlightRatio * 100))%")
                                            Spacer()
                                            Text("\(I18n.t("review.tools.shadowClip", app.language)): \(Int(stats.shadowRatio * 100))%")
                                        }
                                        .font(.caption2.monospacedDigit())
                                        .foregroundStyle(.secondary)
                                    } else {
                                        Text(I18n.t("review.none", app.language))
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .padding(10)
                                .background(Color(.secondarySystemBackground).opacity(0.75))
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                Text(I18n.t("review.tools", app.language))
                                    .font(.caption.bold())
                                    .foregroundStyle(.secondary)
                                if !recentReasons.isEmpty {
                                    Text(I18n.t("review.recentReasons", app.language))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 8) {
                                            ForEach(recentReasons, id: \.self) { reason in
                                                Button(reason) { selectReason(reason) }
                                                    .buttonStyle(.bordered)
                                                    .disabled(isBusy)
                                            }
                                        }
                                    }
                                }
                                Text(I18n.t("review.comboTemplates", app.language))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 8) {
                                        ForEach(comboTemplates, id: \.title) { tpl in
                                            Button(tpl.title) { selectReason(tpl.body) }
                                                .buttonStyle(.bordered)
                                                .disabled(isBusy)
                                        }
                                    }
                                }
                                DisclosureGroup(I18n.t("review.reasonGroup.quality", app.language), isExpanded: $openQualityGroup) {
                                    reasonFlow(qualityReasons)
                                }
                                DisclosureGroup(I18n.t("review.reasonGroup.composition", app.language), isExpanded: $openCompositionGroup) {
                                    reasonFlow(compositionReasons)
                                }
                                DisclosureGroup(I18n.t("review.reasonGroup.compliance", app.language), isExpanded: $openComplianceGroup) {
                                    reasonFlow(complianceReasons)
                                }
                                TextField(I18n.t("review.rejectReason", app.language), text: $rejectReason)
                                    .textInputAutocapitalization(.sentences)
                                    .padding(8)
                                    .background(Color(.secondarySystemBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                    .disabled(isBusy)
                                HStack {
                                    Spacer()
                                    Button(I18n.t("review.reasonClear", app.language)) {
                                        rejectReason = ""
                                    }
                                    .buttonStyle(.bordered)
                                    .disabled(isBusy || rejectReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                                }
                                TextField(I18n.t("review.transferNote", app.language), text: $transferReason)
                                    .textInputAutocapitalization(.sentences)
                                    .padding(8)
                                    .background(Color(.secondarySystemBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                    .disabled(isBusy)

                                if canHot {
                                    Toggle(I18n.t("review.hotToggle", app.language), isOn: Binding(
                                        get: { hotValue },
                                        set: { v in
                                            hotValue = v
                                            onToggleHot(v)
                                        }
                                    ))
                                    .disabled(isBusy)
                                }

                                Toggle(I18n.t("review.autoNext", app.language), isOn: $autoNext)
                                    .disabled(isBusy)

                                HStack {
                                    Button(I18n.t("review.assignToMe", app.language), action: onAssignToMe)
                                        .buttonStyle(.bordered)
                                        .disabled(isBusy)
                                    Button(I18n.t("review.transfer", app.language), action: onTransfer)
                                        .buttonStyle(.bordered)
                                        .disabled(isBusy)
                                }
                            }
                            .padding(12)
                            .background(.ultraThinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .padding(.horizontal, 10)
                            .padding(.bottom, 10)
                        }
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(showTools ? I18n.t("review.toolsHide", app.language) : I18n.t("review.toolsShow", app.language)) {
                        showTools.toggle()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(I18n.t("common.close", app.language)) { dismiss() }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
        .safeAreaInset(edge: .bottom) {
            HStack(spacing: 8) {
                Button(I18n.t("review.approve", app.language)) {
                    armReject = false
                    armRejectNext = false
                    onApprove(autoNext)
                }
                    .buttonStyle(.borderedProminent)
                    .disabled(isBusy)
                Button(I18n.t("review.approveNext", app.language)) {
                    armReject = false
                    armRejectNext = false
                    onApprove(true)
                }
                    .buttonStyle(.borderedProminent)
                    .disabled(isBusy)
                Button(armReject ? I18n.t("review.rejectConfirmTap", app.language) : I18n.t("review.reject", app.language), role: .destructive) {
                    ensureRejectReason()
                    if armReject {
                        onReject(autoNext)
                        armReject = false
                    } else {
                        armReject = true
                        autoDisarmRejectFlags()
                    }
                }
                .buttonStyle(.bordered)
                .disabled(isBusy)
                Button(armRejectNext ? I18n.t("review.rejectConfirmTap", app.language) : I18n.t("review.rejectNext", app.language), role: .destructive) {
                    ensureRejectReason()
                    if armRejectNext {
                        onReject(true)
                        armRejectNext = false
                    } else {
                        armRejectNext = true
                        autoDisarmRejectFlags()
                    }
                }
                .buttonStyle(.bordered)
                .disabled(isBusy)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial)
        }
        .onChange(of: variant) { _ in
            zoom = 1
            baseZoom = 1
            analyzeExposure()
        }
        .onAppear {
            hotValue = photo.hot ?? false
            analyzeExposure()
        }
        .onDisappear {
            exposureTask?.cancel()
        }
    }

    private var qualityReasons: [String] {
        [I18n.t("review.reason.soft", app.language), I18n.t("review.reason.exposure", app.language), I18n.t("review.reason.noise", app.language), I18n.t("review.reason.colorcast", app.language), I18n.t("review.reason.backlit", app.language)]
    }

    private var compositionReasons: [String] {
        [I18n.t("review.reason.crop", app.language), I18n.t("review.reason.horizon", app.language), I18n.t("review.reason.motive", app.language)]
    }

    private var complianceReasons: [String] {
        [I18n.t("review.reason.watermark", app.language), I18n.t("review.reason.duplicate", app.language)]
    }

    private var recentReasons: [String] {
        recentReasonsRaw
            .split(separator: "\n")
            .map(String.init)
            .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    private var comboTemplates: [(title: String, body: String)] {
        [
            (
                I18n.t("review.combo.focus", app.language),
                "\(I18n.t("review.reason.soft", app.language))；请重新对焦并保证主体边缘清晰。"
            ),
            (
                I18n.t("review.combo.light", app.language),
                "\(I18n.t("review.reason.exposure", app.language))；建议调整曝光补偿，保留高光和暗部细节。"
            ),
            (
                I18n.t("review.combo.compose", app.language),
                "\(I18n.t("review.reason.crop", app.language))；建议重新构图，避免主体被切边。"
            ),
            (
                I18n.t("review.combo.noise", app.language),
                "\(I18n.t("review.reason.noise", app.language))；建议降低 ISO 或加强降噪处理。"
            ),
        ]
    }

    private func ensureRejectReason() {
        if rejectReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            rejectReason = I18n.t("review.reason.soft", app.language)
        }
        pushRecentReason(rejectReason)
    }

    private func autoDisarmRejectFlags() {
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 2_500_000_000)
            armReject = false
            armRejectNext = false
        }
    }

    private func selectReason(_ reason: String) {
        rejectReason = reason
        pushRecentReason(reason)
    }

    @ViewBuilder
    private func reasonFlow(_ reasons: [String]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(reasons, id: \.self) { reason in
                Button(reason) { selectReason(reason) }
                    .buttonStyle(.bordered)
                    .disabled(isBusy)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.top, 4)
    }

    private func pushRecentReason(_ reason: String) {
        let trimmed = reason.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        var arr = recentReasons.filter { $0 != trimmed }
        arr.insert(trimmed, at: 0)
        if arr.count > 5 { arr = Array(arr.prefix(5)) }
        recentReasonsRaw = arr.joined(separator: "\n")
    }

    private func exposureLevelText(_ stats: ExposureStats) -> String {
        if stats.highlightRatio > 0.16 || stats.averageLuma > 0.78 {
            return I18n.t("review.tools.exposureHigh", app.language)
        }
        if stats.shadowRatio > 0.22 || stats.averageLuma < 0.26 {
            return I18n.t("review.tools.exposureLow", app.language)
        }
        return I18n.t("review.tools.exposureBalanced", app.language)
    }

    private func analyzeExposure() {
        exposureTask?.cancel()
        exposureLoading = true
        exposureStats = nil
        let url = APIClient.shared.imageURL(photoId: photo.id, variant: variant.rawValue)
        exposureTask = Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                let stats = self.computeExposureStats(from: data)
                await MainActor.run {
                    exposureStats = stats
                    exposureLoading = false
                }
            } catch {
                await MainActor.run {
                    exposureStats = nil
                    exposureLoading = false
                }
            }
        }
    }

    private func computeExposureStats(from data: Data) -> ExposureStats? {
        guard let image = UIImage(data: data), let cg = image.cgImage else { return nil }
        let width = 120
        let height = 120
        let bitsPerComponent = 8
        let bytesPerPixel = 4
        let bytesPerRow = width * bytesPerPixel
        var raw = [UInt8](repeating: 0, count: height * bytesPerRow)
        guard let ctx = CGContext(
            data: &raw,
            width: width,
            height: height,
            bitsPerComponent: bitsPerComponent,
            bytesPerRow: bytesPerRow,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { return nil }
        ctx.interpolationQuality = .medium
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))

        var totalLuma: Double = 0
        var highlight = 0
        var shadow = 0
        let count = width * height
        for i in stride(from: 0, to: raw.count, by: 4) {
            let r = Double(raw[i]) / 255
            let g = Double(raw[i + 1]) / 255
            let b = Double(raw[i + 2]) / 255
            let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
            totalLuma += luma
            if luma > 0.95 { highlight += 1 }
            if luma < 0.08 { shadow += 1 }
        }
        return ExposureStats(
            averageLuma: totalLuma / Double(count),
            highlightRatio: Double(highlight) / Double(count),
            shadowRatio: Double(shadow) / Double(count)
        )
    }
}

private struct CompositionGuideOverlay: View {
    let showGrid: Bool
    let showHorizonGuide: Bool
    let horizonTilt: Double

    var body: some View {
        GeometryReader { geo in
            ZStack {
                if showGrid {
                    Path { path in
                        let w = geo.size.width
                        let h = geo.size.height
                        path.move(to: CGPoint(x: w / 3, y: 0))
                        path.addLine(to: CGPoint(x: w / 3, y: h))
                        path.move(to: CGPoint(x: w * 2 / 3, y: 0))
                        path.addLine(to: CGPoint(x: w * 2 / 3, y: h))
                        path.move(to: CGPoint(x: 0, y: h / 3))
                        path.addLine(to: CGPoint(x: w, y: h / 3))
                        path.move(to: CGPoint(x: 0, y: h * 2 / 3))
                        path.addLine(to: CGPoint(x: w, y: h * 2 / 3))
                    }
                    .stroke(Color.white.opacity(0.72), style: StrokeStyle(lineWidth: 1, dash: [5, 4]))
                }

                if showHorizonGuide {
                    Rectangle()
                        .fill(Color.yellow.opacity(0.9))
                        .frame(width: geo.size.width * 0.86, height: 2)
                        .rotationEffect(.degrees(horizonTilt))
                        .shadow(color: .black.opacity(0.45), radius: 2, x: 0, y: 1)
                }
            }
        }
    }
}
