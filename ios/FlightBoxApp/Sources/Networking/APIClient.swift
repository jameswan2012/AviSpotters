import Foundation

enum APIError: Error {
    case badURL
    case badStatus(Int)
    case decode
    case noReachableEndpoint([String])
}

final class APIClient {
    static let shared = APIClient()
    private init() {}

    // Change to your server domain before release.
    var baseURL = URL(string: "http://localhost:3000")!

    func imageURL(photoId: String, variant: String = "display") -> URL {
        baseURL.appending(path: "/api/photos/\(photoId)/image").appending(queryItems: [URLQueryItem(name: "variant", value: variant)])
    }

    func fetchLatestPhotos() async throws -> [Photo] {
        let candidates = ["/api/mobile/photos", "/api/photos"]
        var failures: [String] = []
        for path in candidates {
            do {
                let url = baseURL.appending(path: path)
                let (data, response) = try await URLSession.shared.data(from: url)
                guard let http = response as? HTTPURLResponse else { throw APIError.badStatus(-1) }
                guard (200..<300).contains(http.statusCode) else { throw APIError.badStatus(http.statusCode) }
                struct MobileListResponse: Decodable {
                    let photos: [Photo]
                }
                if let decoded = try? JSONDecoder().decode(MobileListResponse.self, from: data) {
                    return decoded.photos
                }
                throw APIError.decode
            } catch {
                failures.append("\(path): \(error.localizedDescription)")
            }
        }
        throw APIError.noReachableEndpoint(failures)
    }

    func toggleHot(photoId: String, hot: Bool) async throws -> Photo {
        let url = baseURL.appending(path: "/api/admin/photos/\(photoId)")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["hot": hot])
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.badStatus(-1) }
        guard (200..<300).contains(http.statusCode) else { throw APIError.badStatus(http.statusCode) }
        guard let decoded = try? JSONDecoder().decode(HotToggleResponse.self, from: data) else {
            throw APIError.decode
        }
        return decoded.photo
    }

    func testConnection() async -> String {
        let url = baseURL.appending(path: "/api/mobile/photos").appending(queryItems: [URLQueryItem(name: "limit", value: "1")])
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse else { return "No HTTP response" }
            guard (200..<300).contains(http.statusCode) else { return "HTTP \(http.statusCode)" }
            return data.isEmpty ? "Connected (empty response)" : "Connected"
        } catch {
            return "Failed: \(error.localizedDescription)"
        }
    }
}
