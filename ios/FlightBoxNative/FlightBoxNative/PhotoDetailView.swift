import SwiftUI

struct PhotoDetailView: View {
    @EnvironmentObject var app: AppState
    @EnvironmentObject var auth: AuthStore
    let photo: Photo
    @State private var likeCount = 0
    @State private var liked = false
    @State private var likeError: String?
    @State private var loadingLike = false
    @State private var comments: [PhotoCommentItem] = []
    @State private var commentText = ""
    @State private var commentError: String?
    @State private var sendingComment = false
    @State private var reportText = ""
    @State private var showingReport = false
    @State private var reportError: String?
    @State private var sendingReport = false
    @State private var detail: MobilePhotoDetail?
    @State private var appealText = ""
    @State private var showingAppeal = false
    @State private var appealError: String?
    @State private var sendingAppeal = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                AsyncImage(url: APIClient.shared.imageURL(photoId: photo.id, variant: "display")) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    RoundedRectangle(cornerRadius: 16).fill(Color.gray.opacity(0.2)).frame(height: 240)
                }
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                GlassCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(detail?.title ?? photo.title ?? photo.registration).font(.title3.bold())
                        Text("\(I18n.t("detail.registration", app.language)): \(detail?.registration ?? photo.registration)")
                        Text("\(I18n.t("detail.airport", app.language)): \(detail?.shotAirport ?? photo.shotAirport ?? "-")")
                        Text("\(I18n.t("detail.airline", app.language)): \(detail?.airline ?? photo.airline ?? "-")")
                        Text("\(I18n.t("detail.model", app.language)): \(detail?.aircraftModel ?? photo.aircraftModel ?? "-")")
                        Text("\(I18n.t("detail.author", app.language)): \(detail?.user.name ?? detail?.user.email ?? "-")")
                        if let shotAt = detail?.shotAt, !shotAt.isEmpty {
                            Text("\(I18n.t("detail.shotDate", app.language)): \(shotAt)")
                        }
                        if let desc = detail?.description, !desc.isEmpty {
                            Text(desc).font(.subheadline)
                        }
                        if let reviewReason = detail?.reviewReason, !reviewReason.isEmpty {
                            Text("\(I18n.t("detail.reviewReason", app.language)): \(reviewReason)")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        HStack {
                            Button(loadingLike ? "..." : (liked ? I18n.t("detail.unlike", app.language) : I18n.t("detail.like", app.language))) {
                                Task { await onToggleLike() }
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(loadingLike || auth.user == nil)
                            Text("\(I18n.t("detail.likes", app.language)): \(likeCount)")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        if auth.user == nil {
                            Text(I18n.t("detail.loginRequiredLike", app.language))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        HStack {
                            Button(I18n.t("detail.report", app.language)) { showingReport = true }
                                .buttonStyle(.bordered)
                                .disabled(auth.user == nil)
                            if canAppeal {
                                Button(I18n.t("detail.appeal", app.language)) { showingAppeal = true }
                                    .buttonStyle(.bordered)
                                    .disabled(sendingAppeal)
                            }
                            if auth.user == nil {
                                Text(I18n.t("detail.loginRequired", app.language))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        if let likeError {
                            Text(likeError).font(.caption).foregroundStyle(.red)
                        }
                    }
                    .font(.subheadline)
                }

                GlassCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(I18n.t("detail.comments", app.language)).font(.headline)
                        if auth.user != nil {
                            HStack(spacing: 8) {
                                TextField(I18n.t("detail.addComment", app.language), text: $commentText)
                                    .textInputAutocapitalization(.sentences)
                                    .padding(10)
                                    .background(Color(.secondarySystemBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                Button(sendingComment ? "..." : I18n.t("detail.send", app.language)) {
                                    Task { await sendComment() }
                                }
                                .buttonStyle(.borderedProminent)
                                .disabled(sendingComment || commentText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                            }
                        }
                        if let commentError {
                            Text(commentError).font(.caption).foregroundStyle(.red)
                        }
                        if comments.isEmpty {
                            Text(I18n.t("detail.emptyComments", app.language))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(comments) { c in
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(c.user.name ?? c.user.email)
                                            .font(.caption.bold())
                                            .foregroundStyle(.secondary)
                                        if c.pinned == true {
                                            Text(I18n.t("detail.pinned", app.language))
                                                .font(.caption2.bold())
                                                .foregroundStyle(.orange)
                                        }
                                        Spacer()
                                        if canPin(comment: c) {
                                            Button(c.pinned == true ? I18n.t("detail.unpin", app.language) : I18n.t("detail.pin", app.language)) {
                                                Task { await togglePin(comment: c) }
                                            }
                                            .font(.caption2)
                                        }
                                        if canDelete(comment: c) {
                                            Button(I18n.t("common.delete", app.language), role: .destructive) {
                                                Task { await deleteComment(c.id) }
                                            }
                                            .font(.caption2)
                                        }
                                    }
                                    Text(c.body).font(.subheadline)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 4)
                            }
                        }
                    }
                }
            }
            .padding(16)
        }
        .navigationTitle(I18n.t("home.latest", app.language))
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadLikeStatus()
            await loadComments()
            await loadDetail()
        }
        .sheet(isPresented: $showingReport) {
            NavigationStack {
                Form {
                    Section(I18n.t("detail.report", app.language)) {
                        TextField(I18n.t("detail.reportPlaceholder", app.language), text: $reportText, axis: .vertical)
                            .lineLimit(4, reservesSpace: true)
                        if let reportError {
                            Text(reportError).font(.caption).foregroundStyle(.red)
                        }
                        Button(sendingReport ? "..." : I18n.t("detail.submitReport", app.language)) {
                            Task { await submitReport() }
                        }
                        .disabled(sendingReport || reportText.trimmingCharacters(in: .whitespacesAndNewlines).count < 6)
                    }
                }
                .navigationTitle(I18n.t("detail.report", app.language))
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(I18n.t("common.close", app.language)) { showingReport = false }
                    }
                }
            }
        }
        .sheet(isPresented: $showingAppeal) {
            NavigationStack {
                Form {
                    Section(I18n.t("detail.appeal", app.language)) {
                        TextField(I18n.t("detail.appealPlaceholder", app.language), text: $appealText, axis: .vertical)
                            .lineLimit(4, reservesSpace: true)
                        if let appealError {
                            Text(appealError).font(.caption).foregroundStyle(.red)
                        }
                        Button(sendingAppeal ? "..." : I18n.t("detail.submitAppeal", app.language)) {
                            Task { await submitAppeal() }
                        }
                        .disabled(sendingAppeal || appealText.trimmingCharacters(in: .whitespacesAndNewlines).count < 6)
                    }
                }
                .navigationTitle(I18n.t("detail.appeal", app.language))
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(I18n.t("common.close", app.language)) { showingAppeal = false }
                    }
                }
            }
        }
    }

    private var canAppeal: Bool {
        guard let d = detail, let me = auth.user else { return false }
        return d.status == "rejected" && d.user.id == me.id
    }

    private func canDelete(comment: PhotoCommentItem) -> Bool {
        if comment.user.id == auth.user?.id { return true }
        return (auth.user?.roleId ?? 0) >= 2
    }

    private func canPin(comment: PhotoCommentItem) -> Bool {
        _ = comment
        return (auth.user?.roleId ?? 0) >= 3
    }

    private func loadLikeStatus() async {
        do {
            let s = try await APIClient.shared.getLikeStatus(photoId: photo.id)
            likeCount = s.count
            liked = s.liked
        } catch {
            likeError = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func onToggleLike() async {
        loadingLike = true
        defer { loadingLike = false }
        do {
            let s = try await APIClient.shared.toggleLike(photoId: photo.id)
            likeCount = s.count
            liked = s.liked
            likeError = nil
        } catch {
            likeError = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func loadComments() async {
        do {
            comments = try await APIClient.shared.fetchPhotoComments(photoId: photo.id)
            commentError = nil
        } catch {
            commentError = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func deleteComment(_ id: String) async {
        do {
            try await APIClient.shared.deletePhotoComment(photoId: photo.id, commentId: id)
            comments.removeAll { $0.id == id }
            commentError = nil
        } catch {
            commentError = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func togglePin(comment: PhotoCommentItem) async {
        do {
            try await APIClient.shared.setPhotoCommentPinned(photoId: photo.id, commentId: comment.id, pinned: !(comment.pinned ?? false))
            await loadComments()
        } catch {
            commentError = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func sendComment() async {
        sendingComment = true
        defer { sendingComment = false }
        do {
            try await APIClient.shared.postPhotoComment(photoId: photo.id, body: commentText)
            commentText = ""
            await loadComments()
        } catch {
            commentError = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func submitReport() async {
        sendingReport = true
        defer { sendingReport = false }
        do {
            try await APIClient.shared.submitPhotoReport(photoId: photo.id, message: reportText)
            reportText = ""
            reportError = nil
            showingReport = false
        } catch {
            reportError = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func loadDetail() async {
        do {
            detail = try await APIClient.shared.fetchPhotoDetail(photoId: photo.id)
        } catch {
            do {
                detail = try await APIClient.shared.fetchMyPhotoDetail(photoId: photo.id)
            } catch {
                // ignore detail failure; base info is still available
            }
        }
    }

    private func submitAppeal() async {
        sendingAppeal = true
        defer { sendingAppeal = false }
        do {
            try await APIClient.shared.submitAppeal(photoId: photo.id, message: appealText)
            appealText = ""
            appealError = nil
            showingAppeal = false
        } catch {
            appealError = I18n.error(error.localizedDescription, app.language)
        }
    }
}
