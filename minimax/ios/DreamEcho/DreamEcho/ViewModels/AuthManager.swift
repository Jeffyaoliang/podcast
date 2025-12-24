import Foundation
import SwiftUI

// MARK: - Auth Manager

class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var authToken: String?
    @Published var errorMessage: String?
    
    private let keychain = KeychainHelper()
    
    init() {
        loadStoredAuth()
    }
    
    private func loadStoredAuth() {
        if let token = keychain.read(key: "auth_token"),
           let userData = keychain.read(key: "user_data"),
           !token.isEmpty {
            self.authToken = token
            self.isAuthenticated = true
            
            if let user = try? JSONDecoder().decode(User.self, from: userData) {
                self.currentUser = user
                APIService.shared.setAuthToken(token)
            }
        }
    }
    
    func login(username: String, password: String) async {
        await MainActor.run {
            errorMessage = nil
        }
        
        do {
            let response = try await APIService.shared.login(username: username, password: password)
            
            await MainActor.run {
                self.authToken = response.token
                self.currentUser = response.user
                self.isAuthenticated = true
                
                // Save to keychain
                keychain.save(token, key: "auth_token")
                if let userData = try? JSONEncoder().encode(response.user) {
                    keychain.save(userData, key: "user_data")
                }
                
                APIService.shared.setAuthToken(response.token)
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    func logout() {
        authToken = nil
        currentUser = nil
        isAuthenticated = false
        
        keychain.delete(key: "auth_token")
        keychain.delete(key: "user_data")
        
        APIService.shared.setAuthToken(nil)
    }
}

// MARK: - Keychain Helper

class KeychainHelper {
    func save(_ data: String, key: String) {
        guard let data = data.data(using: .utf8) else { return }
        save(data, key: key)
    }
    
    func save(_ data: Data, key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    func read(key: String) -> String? {
        guard let data = readData(key: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }
    
    func readData(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess else { return nil }
        return result as? Data
    }
    
    func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}

