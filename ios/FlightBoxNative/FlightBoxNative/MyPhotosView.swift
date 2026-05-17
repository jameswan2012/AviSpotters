import SwiftUI
import PhotosUI

struct MyPhotosView: View {
    enum Filter: String, CaseIterable, Identifiable {
        case all
        case pending
        case approved
        case rejected
        var id: String { rawValue }
    }

    @EnvironmentObject var app: AppState
    @EnvironmentObject var auth: AuthStore
    @State private var photos: [Photo] = []
    @State private var loading = false
    @State private var errorText: String?
    @State private var filter: Filter = .all

    var body: some View {
        Group {
            if auth.user == nil {
                VStack(spacing: 12) {
                    Text(I18n.t("mine.title", app.language)).font(.title3.bold())
                    Text(I18n.t("mine.loginHint", app.language))
                        .foregroundStyle(.secondary)
                }
            } else {
                VStack(spacing: 8) {
                    Picker("filter", selection: $filter) {
                        Text(I18n.t("mine.filter.all", app.language)).tag(Filter.all)
                        Text(I18n.t("mine.filter.pending", app.language)).tag(Filter.pending)
                        Text(I18n.t("mine.filter.approved", app.language)).tag(Filter.approved)
                        Text(I18n.t("mine.filter.rejected", app.language)).tag(Filter.rejected)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal, 12)

                    List {
                        ForEach(photos) { p in
                            NavigationLink(value: p) {
                                HStack(spacing: 10) {
                                    AsyncImage(url: APIClient.shared.imageURL(photoId: p.id, variant: "thumb")) { image in
                                        image.resizable().scaledToFill()
                                    } placeholder: {
                                        Color.gray.opacity(0.2)
                                    }
                                    .frame(width: 62, height: 62)
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(p.title ?? p.registration).font(.subheadline.bold()).lineLimit(1)
                                        Text("\(p.airline ?? "-") · \(p.aircraftModel ?? "-")")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                        Text(I18n.status(p.status, app.language))
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    if p.status != "rejected" {
                                        Button(I18n.t("common.delete", app.language), role: .destructive) {
                                            Task { await deletePhoto(id: p.id) }
                                        }
                                        .buttonStyle(.bordered)
                                    }
                                }
                            }
                        }
                    }
                    .navigationDestination(for: Photo.self) { p in
                        PhotoDetailView(photo: p)
                    }
                }
                .overlay {
                    if loading {
                        ProgressView(I18n.t("common.loading", app.language))
                    }
                }
                .overlay {
                    if !loading, photos.isEmpty {
                        Text(I18n.t("mine.empty", app.language))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle(I18n.t("mine.title", app.language))
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                NavigationLink(I18n.t("upload.title", app.language)) {
                    UploadPhotoView()
                }
                .font(.subheadline)
            }
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(I18n.t("appeals.title", app.language)) {
                    AppealsView()
                }
                .font(.subheadline)
            }
        }
        .task { await load() }
        .refreshable { await load() }
        .onChange(of: filter) { _ in
            Task { await load() }
        }
        .alert(I18n.t("common.error", app.language), isPresented: Binding(get: { errorText != nil }, set: { _ in errorText = nil })) {
            Button(I18n.t("common.ok", app.language), role: .cancel) {}
        } message: {
            Text(errorText ?? "")
        }
    }

    private func load() async {
        guard auth.user != nil else { return }
        loading = true
        defer { loading = false }
        do {
            let status: String? = {
                switch filter {
                case .all: return nil
                case .pending: return "pending"
                case .approved: return "approved"
                case .rejected: return "rejected"
                }
            }()
            photos = try await APIClient.shared.fetchMyPhotos(status: status)
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func deletePhoto(id: String) async {
        do {
            try await APIClient.shared.deleteMyPhoto(photoId: id)
            photos.removeAll { $0.id == id }
        } catch {
            errorText = error.localizedDescription
        }
    }
}

struct UploadPhotoView: View {
    @EnvironmentObject var app: AppState
    @EnvironmentObject var auth: AuthStore
    @Environment(\.dismiss) private var dismiss
    @State private var pickedItem: PhotosPickerItem?
    @State private var imageData: Data?
    @State private var previewImage: UIImage?
    @State private var fileName: String = "upload.jpg"
    @State private var mimeType: String = "image/jpeg"
    @State private var loadingMeta = false
    @State private var submitting = false
    @State private var errorText: String?
    @State private var hintText: String?
    @State private var pendingOccupied: Int = 0
    @State private var setting: UploadCategorySetting?
    @State private var domain: String = "domain_civil"
    @State private var tagCategories: Set<String> = []
    @State private var exclusiveCategory: String = ""

    @State private var title = ""
    @State private var shotAt = ""
    @State private var registration = ""
    @State private var msn = ""
    @State private var shotAirport = ""
    @State private var airline = ""
    @State private var aircraftModel = ""
    @State private var description = ""
    @State private var uploaderMessage = ""
    @State private var replyLocale = "zh-Hans"
    @State private var ccAgree = false
    @State private var usePriority = false
    @State private var hot = false

    @State private var watermarkEnabled = true
    @State private var watermarkX = 0.78
    @State private var watermarkY = 0.88
    @State private var watermarkFontSize = 26.0
    @State private var watermarkOpacity = 0.56
    @State private var watermarkFont = "system"

    @State private var prefillLoading = false
    @State private var prefillHint: String?
    @State private var modelSuggest: [UploadModelSuggest] = []
    @State private var airportSuggest: [UploadAirportSuggest] = []

    private let maxBytes = 15 * 1024 * 1024
    private let maxEdge = 2160.0
    private let minEdge = 1280.0

    private var domainOptions: [UploadCategoryDef] {
        (setting?.categories ?? []).filter { $0.group == "domain" && ($0.enabled ?? true) }
    }
    private var tagOptions: [UploadCategoryDef] {
        (setting?.categories ?? []).filter { $0.group == "tag" && ($0.enabled ?? true) }
    }
    private var exclusiveOptions: [UploadCategoryDef] {
        (setting?.categories ?? []).filter { $0.group == "exclusive" && ($0.enabled ?? true) }
    }
    private var canSubmit: Bool {
        !submitting &&
        pendingOccupied < 5 &&
        imageData != nil &&
        !registration.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !shotAirport.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !airline.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !aircraftModel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !domain.isEmpty &&
        ccAgree
    }

    var body: some View {
        let lang = app.language
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if auth.user == nil {
                    Text(I18n.t("upload.loginHint", lang)).foregroundStyle(.secondary)
                } else {
                    if pendingOccupied >= 5 {
                        Text(I18n.t("upload.queueFull", lang))
                            .font(.subheadline)
                            .foregroundStyle(.red)
                    }
                    GroupBox(I18n.t("upload.stepFile", lang)) {
                        VStack(alignment: .leading, spacing: 8) {
                            PhotosPicker(selection: $pickedItem, matching: .images) {
                                Label(I18n.t("upload.pickImage", lang), systemImage: "photo")
                            }
                            if let previewImage {
                                Image(uiImage: previewImage)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(maxHeight: 220)
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            }
                            Text(I18n.t("upload.fileRule", lang))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            if let hintText {
                                Text(hintText).font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                    }

                    GroupBox(I18n.t("upload.stepWatermark", lang)) {
                        VStack(alignment: .leading, spacing: 8) {
                            if let previewImage {
                                UploadWatermarkPreview(
                                    image: previewImage,
                                    enabled: watermarkEnabled,
                                    x: $watermarkX,
                                    y: $watermarkY,
                                    fontSize: watermarkFontSize,
                                    opacity: watermarkOpacity,
                                    font: watermarkFont,
                                    text: watermarkPreviewText
                                )
                                Text(lang == .en ? "Drag watermark on image; it stays inside photo bounds." : lang == .zhHant ? "可直接在圖片上拖動水印，且會限制在圖片範圍內。" : "可直接在图片上拖动水印，且会限制在图片范围内。")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Toggle(I18n.t("upload.watermarkEnabled", lang), isOn: $watermarkEnabled)
                            HStack {
                                Text("X").font(.caption2)
                                Slider(value: $watermarkX, in: 0.02...0.98)
                                Text(String(format: "%.2f", watermarkX)).font(.caption2.monospacedDigit())
                            }
                            HStack {
                                Text("Y").font(.caption2)
                                Slider(value: $watermarkY, in: 0.02...0.98)
                                Text(String(format: "%.2f", watermarkY)).font(.caption2.monospacedDigit())
                            }
                            HStack {
                                Text(I18n.t("upload.watermarkFont", lang)).font(.caption2)
                                Picker("wmFont", selection: $watermarkFont) {
                                    Text("System").tag("system")
                                    Text("Rounded").tag("rounded")
                                    Text("Serif").tag("serif")
                                    Text("Mono").tag("mono")
                                    Text("Script").tag("script")
                                }
                            }
                            HStack {
                                Text(I18n.t("upload.watermarkSize", lang)).font(.caption2)
                                Slider(value: $watermarkFontSize, in: 14...60, step: 1)
                            }
                            HStack {
                                Text(I18n.t("upload.watermarkOpacity", lang)).font(.caption2)
                                Slider(value: $watermarkOpacity, in: 0.15...0.95, step: 0.01)
                            }
                        }
                    }

                    GroupBox(I18n.t("upload.stepCategory", lang)) {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(I18n.t("upload.categoryDomain", lang)).font(.caption).foregroundStyle(.secondary)
                            chipWrap(domainOptions, selectedSingle: domain) { item in
                                domain = item.id
                            }
                            Text(I18n.t("upload.categoryTags", lang)).font(.caption).foregroundStyle(.secondary)
                            chipWrap(tagOptions, selectedSingle: nil) { item in
                                if tagCategories.contains(item.id) { tagCategories.remove(item.id) } else { tagCategories.insert(item.id) }
                            }
                            Text(I18n.t("upload.categoryExclusive", lang)).font(.caption).foregroundStyle(.secondary)
                            chipWrap(exclusiveOptions, selectedSingle: exclusiveCategory) { item in
                                exclusiveCategory = (exclusiveCategory == item.id) ? "" : item.id
                            }
                        }
                    }

                    GroupBox(I18n.t("upload.stepInfo", lang)) {
                        VStack(spacing: 10) {
                            field(I18n.t("upload.titleField", lang), text: $title)
                            field(I18n.t("upload.shotAt", lang), text: $shotAt)
                            HStack {
                                field(I18n.t("upload.registration", lang), text: $registration)
                                Button(prefillLoading ? I18n.t("upload.checking", lang) : I18n.t("upload.check", lang)) {
                                    Task { await runPrefill() }
                                }
                                .buttonStyle(.bordered)
                                .disabled(prefillLoading || registration.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                            }
                            if let prefillHint {
                                Text(prefillHint).font(.caption2).foregroundStyle(.secondary)
                            }
                            field(I18n.t("upload.msn", lang), text: $msn)
                            field(I18n.t("upload.airport", lang), text: $shotAirport)
                                .onChange(of: shotAirport) { _ in Task { await searchAirportSuggest() } }
                            if !airportSuggest.isEmpty {
                                suggestList(airportSuggest.map { "\($0.nameZh) / \($0.code)" }) { v in
                                    shotAirport = v
                                    airportSuggest = []
                                }
                            }
                            field(I18n.t("upload.airline", lang), text: $airline)
                            field(I18n.t("upload.model", lang), text: $aircraftModel)
                                .onChange(of: aircraftModel) { _ in Task { await searchModelSuggest() } }
                            if !modelSuggest.isEmpty {
                                suggestList(modelSuggest.map(\.name)) { v in
                                    aircraftModel = v
                                    modelSuggest = []
                                }
                            }
                            field(I18n.t("upload.description", lang), text: $description, axis: .vertical)
                            field(I18n.t("upload.message", lang), text: $uploaderMessage, axis: .vertical)
                            Picker(I18n.t("upload.replyLocale", lang), selection: $replyLocale) {
                                Text(I18n.t("lang.zhHans", lang)).tag("zh-Hans")
                                Text(I18n.t("lang.zhHant", lang)).tag("zh-Hant")
                                Text(I18n.t("lang.en", lang)).tag("en")
                            }
                        }
                    }

                    GroupBox(I18n.t("upload.stepOptions", lang)) {
                        VStack(alignment: .leading, spacing: 8) {
                            Toggle(I18n.t("upload.priority", lang), isOn: $usePriority)
                                .disabled((auth.user?.priorityPasses ?? 0) <= 0)
                            Text("\(I18n.t("upload.priorityRemaining", lang)): \(auth.user?.priorityPasses ?? 0)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Toggle("HOT", isOn: $hot)
                            Toggle(I18n.t("upload.ccAgree", lang), isOn: $ccAgree)
                        }
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        HStack {
                            Spacer()
                            Text(submitting ? I18n.t("upload.submitting", lang) : I18n.t("upload.submit", lang))
                            Spacer()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(!canSubmit)
                }
            }
            .padding(12)
        }
        .overlay {
            if loadingMeta {
                ProgressView(I18n.t("common.loading", lang))
            }
        }
        .navigationTitle(I18n.t("upload.title", lang))
        .task { await loadMeta() }
        .onChange(of: pickedItem) { _ in
            Task { await loadPickedImage() }
        }
        .alert(I18n.t("common.error", lang), isPresented: Binding(get: { errorText != nil }, set: { _ in errorText = nil })) {
            Button(I18n.t("common.ok", lang), role: .cancel) {}
        } message: {
            Text(errorText ?? "")
        }
    }

    private var watermarkPreviewText: String {
        let who = (auth.user?.name ?? auth.user?.email ?? "AviSpotters").trimmingCharacters(in: .whitespacesAndNewlines)
        return "© \(who)"
    }

    @ViewBuilder
    private func chipWrap(_ rows: [UploadCategoryDef], selectedSingle: String?, onTap: @escaping (UploadCategoryDef) -> Void) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], spacing: 8) {
            ForEach(rows) { item in
                let active = selectedSingle != nil ? selectedSingle == item.id : tagCategories.contains(item.id)
                Button(labelFor(item)) { onTap(item) }
                    .font(.caption)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .frame(maxWidth: .infinity)
                    .background(active ? Color.blue.opacity(0.15) : Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
        }
    }

    @ViewBuilder
    private func suggestList(_ values: [String], onTap: @escaping (String) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(values.prefix(6), id: \.self) { value in
                Button(value) { onTap(value) }
                    .font(.caption)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 4)
            }
        }
    }

    private func field(_ title: String, text: Binding<String>, axis: Axis = .horizontal) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption2).foregroundStyle(.secondary)
            TextField(title, text: text, axis: axis)
                .textFieldStyle(.roundedBorder)
        }
    }

    private func labelFor(_ item: UploadCategoryDef) -> String {
        switch app.language {
        case .en: return item.en
        case .zhHans: return item.zhHans
        case .zhHant: return item.zhHant
        }
    }

    private func loadMeta() async {
        guard auth.user != nil else { return }
        loadingMeta = true
        defer { loadingMeta = false }
        do {
            async let categories = APIClient.shared.fetchPhotoCategorySetting()
            async let pending = APIClient.shared.fetchMyPhotos(status: "pending")
            let (c, p) = try await (categories, pending)
            setting = c
            pendingOccupied = p.count
            if domainOptions.isEmpty == false, !domainOptions.contains(where: { $0.id == domain }) {
                domain = domainOptions.first?.id ?? domain
            }
        } catch {
            errorText = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func loadPickedImage() async {
        guard let pickedItem else { return }
        do {
            guard let data = try await pickedItem.loadTransferable(type: Data.self) else { return }
            guard data.count <= maxBytes else {
                errorText = I18n.t("upload.error.tooLarge", app.language)
                return
            }
            guard let image = UIImage(data: data), let cg = image.cgImage else {
                errorText = I18n.t("upload.error.invalidImage", app.language)
                return
            }
            let w = Double(cg.width)
            let h = Double(cg.height)
            let ratio = w / h
            let targets: [Double] = [16.0 / 9.0, 3.0 / 2.0, 4.0 / 3.0, 3.0 / 4.0]
            let allowed = targets.contains { abs($0 - ratio) <= 0.015 }
            guard allowed else {
                errorText = I18n.t("upload.error.aspect", app.language)
                return
            }
            let edge = max(w, h)
            guard edge >= minEdge else {
                errorText = I18n.t("upload.error.tooSmall", app.language)
                return
            }
            hintText = edge > maxEdge ? I18n.t("upload.hint.compress", app.language) : nil
            imageData = data
            previewImage = image
            fileName = "upload.\((data.starts(with: [0x89, 0x50, 0x4E, 0x47])) ? "png" : "jpg")"
            mimeType = fileName.hasSuffix(".png") ? "image/png" : "image/jpeg"
        } catch {
            errorText = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func runPrefill() async {
        let reg = registration.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !reg.isEmpty else { return }
        prefillLoading = true
        defer { prefillLoading = false }
        do {
            let res = try await APIClient.shared.fetchAircraftPrefill(registration: reg)
            guard res.found, let data = res.data else {
                prefillHint = I18n.t("upload.prefillNotFound", app.language)
                return
            }
            if (aircraftModel.trimmingCharacters(in: .whitespacesAndNewlines)).isEmpty, let v = data.aircraftModel { aircraftModel = v }
            if (airline.trimmingCharacters(in: .whitespacesAndNewlines)).isEmpty, let v = data.airline { airline = v }
            if (msn.trimmingCharacters(in: .whitespacesAndNewlines)).isEmpty, let v = data.msn { msn = v }
            prefillHint = I18n.t("upload.prefillFound", app.language)
        } catch {
            prefillHint = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func searchModelSuggest() async {
        let q = aircraftModel.trimmingCharacters(in: .whitespacesAndNewlines)
        guard q.count >= 2 else {
            modelSuggest = []
            return
        }
        do {
            modelSuggest = try await APIClient.shared.searchModels(query: q, limit: 6)
        } catch {
            modelSuggest = []
        }
    }

    private func searchAirportSuggest() async {
        let q = shotAirport.trimmingCharacters(in: .whitespacesAndNewlines)
        guard q.count >= 2 else {
            airportSuggest = []
            return
        }
        do {
            airportSuggest = try await APIClient.shared.searchAirports(query: q, limit: 6)
        } catch {
            airportSuggest = []
        }
    }

    private func submit() async {
        guard let imageData else { return }
        submitting = true
        defer { submitting = false }
        do {
            let categories = [domain] + Array(tagCategories) + (exclusiveCategory.isEmpty ? [] : [exclusiveCategory])
            let req = UploadPhotoRequest(
                clientUploadId: UUID().uuidString,
                imageData: imageData,
                fileName: fileName,
                mimeType: mimeType,
                title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                shotAt: shotAt.trimmingCharacters(in: .whitespacesAndNewlines),
                registration: registration.trimmingCharacters(in: .whitespacesAndNewlines),
                msn: msn.trimmingCharacters(in: .whitespacesAndNewlines),
                shotAirport: shotAirport.trimmingCharacters(in: .whitespacesAndNewlines),
                airline: airline.trimmingCharacters(in: .whitespacesAndNewlines),
                aircraftModel: aircraftModel.trimmingCharacters(in: .whitespacesAndNewlines),
                description: description.trimmingCharacters(in: .whitespacesAndNewlines),
                uploaderMessage: uploaderMessage.trimmingCharacters(in: .whitespacesAndNewlines),
                ccAgree: ccAgree,
                replyLocale: replyLocale,
                categories: categories,
                priority: usePriority,
                hot: hot,
                watermark: UploadWatermarkPayload(
                    enabled: watermarkEnabled,
                    x: watermarkX,
                    y: watermarkY,
                    fontSize: watermarkFontSize,
                    opacity: watermarkOpacity,
                    font: watermarkFont
                )
            )
            _ = try await APIClient.shared.uploadPhoto(req)
            dismiss()
        } catch {
            errorText = I18n.error(error.localizedDescription, app.language)
        }
    }
}

private struct UploadWatermarkPreview: View {
    let image: UIImage
    let enabled: Bool
    @Binding var x: Double
    @Binding var y: Double
    let fontSize: Double
    let opacity: Double
    let font: String
    let text: String

    var body: some View {
        GeometryReader { geo in
            let canvas = geo.size
            let imageSize = image.size
            let fit = aspectFitRect(imageSize: imageSize, in: canvas)
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.black)
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(width: canvas.width, height: canvas.height)
                Path { path in
                    path.addRoundedRect(in: fit, cornerSize: CGSize(width: 6, height: 6))
                }
                .stroke(Color.white.opacity(0.35), lineWidth: 1)

                if enabled {
                    Text(text)
                        .font(watermarkFont())
                        .foregroundStyle(Color.white.opacity(opacity))
                        .shadow(color: .black.opacity(0.85), radius: 2, x: 0, y: 1)
                        .position(watermarkPosition(in: fit))
                        .gesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { value in
                                    updateNormalizedPosition(location: value.location, fitRect: fit)
                                }
                        )
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.black.opacity(0.8), lineWidth: 2)
            )
        }
        .frame(maxWidth: .infinity)
        .frame(height: 260)
    }

    private func watermarkPosition(in rect: CGRect) -> CGPoint {
        CGPoint(x: rect.minX + rect.width * x, y: rect.minY + rect.height * y)
    }

    private func updateNormalizedPosition(location: CGPoint, fitRect: CGRect) {
        let margin: CGFloat = 10
        let px = min(max(location.x, fitRect.minX + margin), fitRect.maxX - margin)
        let py = min(max(location.y, fitRect.minY + margin), fitRect.maxY - margin)
        let nx = (px - fitRect.minX) / max(fitRect.width, 1)
        let ny = (py - fitRect.minY) / max(fitRect.height, 1)
        x = Double(min(max(nx, 0.02), 0.98))
        y = Double(min(max(ny, 0.02), 0.98))
    }

    private func watermarkFont() -> Font {
        switch font {
        case "rounded":
            return .system(size: fontSize, weight: .semibold, design: .rounded)
        case "serif":
            return .system(size: fontSize, weight: .regular, design: .serif)
        case "mono":
            return .system(size: fontSize, weight: .regular, design: .monospaced)
        default:
            return .system(size: fontSize, weight: .semibold, design: .default)
        }
    }

    private func aspectFitRect(imageSize: CGSize, in canvas: CGSize) -> CGRect {
        guard imageSize.width > 0, imageSize.height > 0, canvas.width > 0, canvas.height > 0 else {
            return CGRect(origin: .zero, size: canvas)
        }
        let imageAspect = imageSize.width / imageSize.height
        let canvasAspect = canvas.width / canvas.height
        if imageAspect > canvasAspect {
            let w = canvas.width
            let h = w / imageAspect
            return CGRect(x: 0, y: (canvas.height - h) / 2, width: w, height: h)
        } else {
            let h = canvas.height
            let w = h * imageAspect
            return CGRect(x: (canvas.width - w) / 2, y: 0, width: w, height: h)
        }
    }
}

struct AppealsView: View {
    enum AppealFilter: String, CaseIterable, Identifiable {
        case all
        case open
        case closed
        var id: String { rawValue }
    }

    @EnvironmentObject var app: AppState
    @EnvironmentObject var auth: AuthStore
    @State private var appeals: [AppealItem] = []
    @State private var loading = false
    @State private var errorText: String?
    @State private var filter: AppealFilter = .all

    var body: some View {
        List {
            if let errorText {
                Section { Text(errorText).foregroundStyle(.red) }
            }
            Section {
                Picker("appealsFilter", selection: $filter) {
                    Text(I18n.t("appeals.filter.all", app.language)).tag(AppealFilter.all)
                    Text(I18n.t("appeals.filter.open", app.language)).tag(AppealFilter.open)
                    Text(I18n.t("appeals.filter.closed", app.language)).tag(AppealFilter.closed)
                }
                .pickerStyle(.segmented)
            }
            ForEach(filteredAppeals) { a in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(a.photo.title ?? a.photo.registration).font(.headline)
                        Spacer()
                        Text(I18n.status(a.status, app.language)).font(.caption).foregroundStyle(.secondary)
                    }
                    Text(a.message).font(.subheadline)
                    if let reply = a.staffReply, !reply.isEmpty {
                        Text("\(I18n.t("appeals.reply", app.language)): \(reply)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if a.status == "open" {
                        Button(I18n.t("appeals.cancel", app.language), role: .destructive) {
                            Task { await cancelAppeal(a.id) }
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .overlay {
            if loading { ProgressView(I18n.t("common.loading", app.language)) }
        }
        .navigationTitle(I18n.t("appeals.title", app.language))
        .task { await loadAppeals() }
        .refreshable { await loadAppeals() }
    }

    private var filteredAppeals: [AppealItem] {
        switch filter {
        case .all:
            return appeals
        case .open:
            return appeals.filter { $0.status.lowercased() == "open" }
        case .closed:
            return appeals.filter { $0.status.lowercased() != "open" }
        }
    }

    private func loadAppeals() async {
        guard auth.user != nil else { return }
        loading = true
        defer { loading = false }
        do {
            appeals = try await APIClient.shared.fetchMyAppeals()
            errorText = appeals.isEmpty ? I18n.t("appeals.empty", app.language) : nil
        } catch {
            errorText = I18n.error(error.localizedDescription, app.language)
        }
    }

    private func cancelAppeal(_ id: String) async {
        do {
            try await APIClient.shared.cancelAppeal(appealId: id)
            appeals.removeAll { $0.id == id }
            errorText = appeals.isEmpty ? I18n.t("appeals.empty", app.language) : nil
        } catch {
            errorText = I18n.error(error.localizedDescription, app.language)
        }
    }
}
