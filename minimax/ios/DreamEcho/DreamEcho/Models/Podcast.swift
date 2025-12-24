import Foundation

// MARK: - Podcast Model

struct Podcast: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    let imageURL: String?
    let author: String
    let rssURL: String
    let link: String?
    
    enum CodingKeys: String, CodingKey {
        case id, title, description
        case imageURL = "image_url"
        case author
        case rssURL = "rss_url"
        case link
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID().uuidString
        self.title = try container.decode(String.self, forKey: .title)
        self.description = try container.decode(String.self, forKey: .description)
        self.imageURL = try container.decodeIfPresent(String.self, forKey: .imageURL)
        self.author = try container.decodeIfPresent(String.self, forKey: .author) ?? ""
        self.rssURL = try container.decode(String.self, forKey: .rssURL)
        self.link = try container.decodeIfPresent(String.self, forKey: .link)
    }
    
    init(title: String, description: String, imageURL: String?, author: String, rssURL: String, link: String?) {
        self.id = UUID().uuidString
        self.title = title
        self.description = description
        self.imageURL = imageURL
        self.author = author
        self.rssURL = rssURL
        self.link = link
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(rssURL)
    }
    
    static func == (lhs: Podcast, rhs: Podcast) -> Bool {
        lhs.rssURL == rhs.rssURL
    }
}

// MARK: - Episode Model

struct Episode: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    let audioURL: String?
    let pubDate: String
    let duration: String?
    let image: String?
    
    enum CodingKeys: String, CodingKey {
        case id, title, description
        case audioURL = "audio_url"
        case pubDate = "pub_date"
        case duration
        case image
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID().uuidString
        self.title = try container.decode(String.self, forKey: .title)
        self.description = try container.decode(String.self, forKey: .description)
        self.audioURL = try container.decodeIfPresent(String.self, forKey: .audioURL)
        self.pubDate = try container.decode(String.self, forKey: .pubDate)
        self.duration = try container.decodeIfPresent(String.self, forKey: .duration)
        self.image = try container.decodeIfPresent(String.self, forKey: .image)
    }
    
    init(title: String, description: String, audioURL: String?, pubDate: String, duration: String?, image: String?) {
        self.id = UUID().uuidString
        self.title = title
        self.description = description
        self.audioURL = audioURL
        self.pubDate = pubDate
        self.duration = duration
        self.image = image
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(title)
    }
    
    static func == (lhs: Episode, rhs: Episode) -> Bool {
        lhs.title == rhs.title && lhs.audioURL == rhs.audioURL
    }
}

// MARK: - Feed Response

struct FeedResponse: Codable {
    let title: String
    let description: String
    let image: String?
    let author: String?
    let link: String?
    let items: [Episode]
    
    enum CodingKeys: String, CodingKey {
        case title, description, image, author, link, items
    }
}

// MARK: - User Model

struct User: Codable, Identifiable {
    let id: String
    let username: String
}

// MARK: - Auth Response

struct AuthResponse: Codable {
    let token: String
    let user: User
}

