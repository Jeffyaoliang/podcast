import Foundation

// MARK: - API Service

class APIService {
    static let shared = APIService()
    private let baseURL = "http://localhost:8080/api"
    private var authToken: String?
    
    private init() {}
    
    func setAuthToken(_ token: String?) {
        self.authToken = token
    }
    
    private func makeRequest(endpoint: String, method: String = "GET", body: Data? = nil) async throws -> Data {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }
        
        return data
    }
    
    // MARK: - Authentication
    
    func login(username: String, password: String) async throws -> AuthResponse {
        let body = ["username": username, "password": password]
        let data = try JSONSerialization.data(withJSONObject: body)
        
        let responseData = try await makeRequest(endpoint: "/login", method: "POST", body: data)
        let decoder = JSONDecoder()
        return try decoder.decode(AuthResponse.self, from: responseData)
    }
    
    // MARK: - Feed
    
    func fetchFeed(url: String) async throws -> FeedResponse {
        let encodedURL = url.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? url
        let responseData = try await makeRequest(endpoint: "/feed?url=\(encodedURL)")
        let decoder = JSONDecoder()
        return try decoder.decode(FeedResponse.self, from: responseData)
    }
    
    // MARK: - Profile
    
    func fetchProfile() async throws -> [String: String] {
        let responseData = try await makeRequest(endpoint: "/profile")
        let decoder = JSONDecoder()
        return try decoder.decode([String: String].self, from: responseData)
    }
    
    // MARK: - Subscriptions
    
    func fetchSubscriptions() async throws -> [String: Bool] {
        let responseData = try await makeRequest(endpoint: "/subscriptions")
        let decoder = JSONDecoder()
        return try decoder.decode([String: Bool].self, from: responseData)
    }
    
    func addSubscription(url: String) async throws {
        let body = ["url": url]
        let data = try JSONSerialization.data(withJSONObject: body)
        _ = try await makeRequest(endpoint: "/subscriptions", method: "POST", body: data)
    }
    
    func removeSubscription(url: String) async throws {
        let encodedURL = url.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? url
        _ = try await makeRequest(endpoint: "/subscriptions/\(encodedURL)", method: "DELETE")
    }
}

// MARK: - API Error

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .decodingError:
            return "Failed to decode response"
        }
    }
}

// MARK: - JSON Helpers

extension Dictionary {
    func toData() throws -> Data {
        try JSONSerialization.data(withJSONObject: self)
    }
}

