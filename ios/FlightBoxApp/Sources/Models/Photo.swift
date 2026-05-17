import Foundation

struct Photo: Identifiable, Decodable, Hashable {
    let id: String
    let title: String?
    let registration: String
    let airline: String?
    let aircraftModel: String?
    let shotAirport: String?
    let status: String?
    let hot: Bool?
}

struct HotToggleResponse: Decodable {
    let photo: Photo
}
