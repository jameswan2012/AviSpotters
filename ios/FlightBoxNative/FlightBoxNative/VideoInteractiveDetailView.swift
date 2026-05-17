import SwiftUI
import AVKit

struct VideoInteractiveDetailView: View {
    @EnvironmentObject var app: AppState
    @EnvironmentObject var auth: AuthStore
    let videoId: String

    @State private var video: VideoItem?
    @State private var loading = false
    @State private var message: String?

    @State private var liked = false
    @State private var favorited = false
    @State private var likeCount = 0
    @State private var favoriteCount = 0

    @State private var likeBusy = false
    @State private var favoriteBusy = false
    @State private var comments: [VideoCommentItem] = []
    @State private var commentsCursor: String?
    @State private var loadingComments = false
    @State private var loadingMoreComments = false
    @State private var commentText = ""
    @State private var sendingComment = false

    @State private var shareTargets: VideoShareTargetsPayload?
    @State private var shareBusy = false
    @State private var showingShareTargets = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if let video {
                    mediaBlock(video)
                    metaBlock(video)
                    actionBlock(video)
                    commentsBlock
                } else if let message {
                    Text(message)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .padding(.top, 20)
                }
            }
            .padding(12)
        }
        .navigationTitle(I18n.t("tab.video", app.language))
        .overlay { if loading { ProgressView() } }
        .task { await reloadAll() }
        .refreshable { await reloadAll() }
        .sheet(isPresented: $showingShareTargets) {
            NavigationStack {
                List {
                    if let targets = shareTargets {
                        Section("System") {
                            if let url = URL(string: "\(APIClient.shared.baseURL.absoluteString)/video/\(videoId)") {
                                ShareLink(item: url) {
                                    Label(I18n.t("video.detail.systemShare", app.language), systemImage: "square.and.arrow.up")
                                }
                            }
                        }
                        if !targets.privateTargets.isEmpty {
                            Section(I18n.t("video.detail.sharePrivate", app.language)) {
                                ForEach(targets.privateTargets) { u in
                                    Button(u.name) {
                                        Task { await shareToUser(u.id) }
                                    }
                                    .disabled(shareBusy)
                                }
                            }
                        }
                        if !targets.groups.isEmpty {
                            Section(I18n.t("video.detail.shareGroup", app.language)) {
                                ForEach(targets.groups) { g in
                                    Button(g.name) {
                                        Task { await shareToGroup(g.id) }
                                    }
                                    .disabled(shareBusy)
                                }
                            }
                        }
                    } else {
                        Section {
                            ProgressView(I18n.t("common.loading", app.language))
                        }
                    }
                }
                .navigationTitle(I18n.t("video.detail.share", app.language))
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(I18n.t("common.close", app.language)) { showingShareTargets = false }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func mediaBlock(_ video: VideoItem) -> some View {
        if video.type == "video", let vp = video.videoPath, !vp.isEmpty {
            VideoPlayer(player: AVPlayer(url: APIClient.shared.videoAssetURL(path: vp)))
                .frame(height: 260)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        } else {
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
    }

    @ViewBuilder
    private func metaBlock(_ video: VideoItem) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 8) {
                Text(video.description)
                    .font(.body)
                if let location = video.location, !location.isEmpty {
                    Text(location)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 14) {
                    Label("\(video.viewCount)", systemImage: "eye")
                    Label("\(likeCount)", systemImage: "hand.thumbsup")
                    Label("\(video.commentCount)", systemImage: "text.bubble")
                    Label("\(favoriteCount)", systemImage: "bookmark")
                    Label("\(video.shareCount)", systemImage: "arrowshape.turn.up.right")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                Text(video.account.nickname)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func actionBlock(_ video: VideoItem) -> some View {
        HStack(spacing: 10) {
            Button(liked ? I18n.t("video.detail.unlike", app.language) : I18n.t("video.detail.like", app.language)) {
                Task { await toggleLike() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(likeBusy || auth.user == nil)

            Button(favorited ? I18n.t("video.detail.unfavorite", app.language) : I18n.t("video.detail.favorite", app.language)) {
                Task { await toggleFavorite() }
            }
            .buttonStyle(.bordered)
            .disabled(favoriteBusy || auth.user == nil)

            Button(I18n.t("video.detail.share", app.language)) {
                Task { await openShareTargets() }
            }
            .buttonStyle(.bordered)
            .disabled(shareBusy || auth.user == nil)
        }
        if auth.user == nil {
            Text(I18n.t("detail.loginRequired", app.language))
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private var commentsBlock: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 8) {
                Text(I18n.t("video.detail.comments", app.language))
                    .font(.headline)

                if auth.user != nil {
                    HStack(spacing: 8) {
                        TextField(I18n.t("video.detail.commentPlaceholder", app.language), text: $commentText)
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

                if loadingComments {
                    ProgressView(I18n.t("common.loading", app.language))
                } else if comments.isEmpty {
                    Text(I18n.t("detail.emptyComments", app.language))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(comments) { c in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(c.account.nickname ?? c.account.id)
                                    .font(.caption.bold())
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text(formatTime(c.createdAt))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Text(c.body)
                                .font(.subheadline)
                            if let replies = c.replies, !replies.isEmpty {
                                ForEach(replies) { r in
                                    HStack(alignment: .top, spacing: 6) {
                                        Circle().fill(Color.gray.opacity(0.35)).frame(width: 4, height: 4).padding(.top, 6)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text((r.account.nickname ?? r.account.id) + ": " + r.body)
                                                .font(.caption)
                                            Text(formatTime(r.createdAt))
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    .padding(.leading, 8)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    if commentsCursor != nil {
                        Button(loadingMoreComments ? I18n.t("common.loading", app.language) : I18n.t("common.loadMore", app.language)) {
                            Task { await loadMoreComments() }
                        }
                        .buttonStyle(.bordered)
                        .disabled(loadingMoreComments)
                    }
                }
            }
        }
    }

    private func reloadAll() async {
        loading = true
        defer { loading = false }
        do {
            let item = try await APIClient.shared.fetchVideoDetail(videoId: videoId)
            video = item
            liked = item.isLiked ?? false
            favorited = item.isFavorited ?? false
            likeCount = item.likeCount
            favoriteCount = item.favoriteCount
            message = nil
            await reloadComments()
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func reloadComments() async {
        loadingComments = true
        defer { loadingComments = false }
        do {
            let payload = try await APIClient.shared.fetchVideoComments(videoId: videoId, limit: 20)
            comments = payload.comments
            commentsCursor = payload.nextCursor
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func loadMoreComments() async {
        guard let cursor = commentsCursor, !cursor.isEmpty else { return }
        loadingMoreComments = true
        defer { loadingMoreComments = false }
        do {
            let payload = try await APIClient.shared.fetchVideoComments(videoId: videoId, cursor: cursor, limit: 20)
            comments.append(contentsOf: payload.comments)
            commentsCursor = payload.nextCursor
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func sendComment() async {
        let body = commentText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return }
        sendingComment = true
        defer { sendingComment = false }
        do {
            _ = try await APIClient.shared.postVideoComment(videoId: videoId, content: body)
            commentText = ""
            await reloadComments()
            if let v = video {
                video = VideoItem(
                    id: v.id, type: v.type, status: v.status, description: v.description, location: v.location,
                    thumbnailPath: v.thumbnailPath, videoPath: v.videoPath, imagePathsJson: v.imagePathsJson,
                    viewCount: v.viewCount, likeCount: likeCount, commentCount: v.commentCount + 1, shareCount: v.shareCount,
                    createdAt: v.createdAt, relatedPhoto: v.relatedPhoto, account: v.account,
                    isLiked: liked, isFavorited: favorited, isFollowing: v.isFollowing, isOwner: v.isOwner, canModify: v.canModify
                )
            }
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func toggleLike() async {
        likeBusy = true
        defer { likeBusy = false }
        do {
            let out = try await APIClient.shared.toggleVideoLike(videoId: videoId)
            liked = out.liked
            likeCount = out.likeCount
            if let v = video {
                video = VideoItem(
                    id: v.id, type: v.type, status: v.status, description: v.description, location: v.location,
                    thumbnailPath: v.thumbnailPath, videoPath: v.videoPath, imagePathsJson: v.imagePathsJson,
                    viewCount: v.viewCount, likeCount: out.likeCount, commentCount: v.commentCount, shareCount: v.shareCount,
                    createdAt: v.createdAt, relatedPhoto: v.relatedPhoto, account: v.account,
                    isLiked: out.liked, isFavorited: favorited, isFollowing: v.isFollowing, isOwner: v.isOwner, canModify: v.canModify
                )
            }
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func toggleFavorite() async {
        favoriteBusy = true
        defer { favoriteBusy = false }
        do {
            let next = try await APIClient.shared.toggleVideoFavorite(videoId: videoId)
            favorited = next
            favoriteCount = max(0, favoriteCount + (next ? 1 : -1))
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func openShareTargets() async {
        shareBusy = true
        defer { shareBusy = false }
        do {
            shareTargets = try await APIClient.shared.fetchVideoShareTargets()
            showingShareTargets = true
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func shareToUser(_ userId: String) async {
        shareBusy = true
        defer { shareBusy = false }
        do {
            try await APIClient.shared.shareVideo(videoId: videoId, shareType: "private", targetUserId: userId)
            showingShareTargets = false
            if let v = video {
                video = VideoItem(
                    id: v.id, type: v.type, status: v.status, description: v.description, location: v.location,
                    thumbnailPath: v.thumbnailPath, videoPath: v.videoPath, imagePathsJson: v.imagePathsJson,
                    viewCount: v.viewCount, likeCount: likeCount, commentCount: v.commentCount, shareCount: v.shareCount + 1,
                    createdAt: v.createdAt, relatedPhoto: v.relatedPhoto, account: v.account,
                    isLiked: liked, isFavorited: favorited, isFollowing: v.isFollowing, isOwner: v.isOwner, canModify: v.canModify
                )
            }
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func shareToGroup(_ roomId: String) async {
        shareBusy = true
        defer { shareBusy = false }
        do {
            try await APIClient.shared.shareVideo(videoId: videoId, shareType: "group", targetRoomId: roomId)
            showingShareTargets = false
            if let v = video {
                video = VideoItem(
                    id: v.id, type: v.type, status: v.status, description: v.description, location: v.location,
                    thumbnailPath: v.thumbnailPath, videoPath: v.videoPath, imagePathsJson: v.imagePathsJson,
                    viewCount: v.viewCount, likeCount: likeCount, commentCount: v.commentCount, shareCount: v.shareCount + 1,
                    createdAt: v.createdAt, relatedPhoto: v.relatedPhoto, account: v.account,
                    isLiked: liked, isFavorited: favorited, isFollowing: v.isFollowing, isOwner: v.isOwner, canModify: v.canModify
                )
            }
        } catch {
            message = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func parseImagePaths(_ raw: String) -> [String] {
        guard let data = raw.data(using: .utf8) else { return [] }
        let arr = (try? JSONDecoder().decode([String].self, from: data)) ?? []
        return arr.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    private func formatTime(_ value: String) -> String {
        value.replacingOccurrences(of: "T", with: " ").replacingOccurrences(of: "Z", with: "")
    }
}

