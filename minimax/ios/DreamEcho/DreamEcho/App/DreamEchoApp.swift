import SwiftUI

@main
struct DreamEchoApp: App {
    @StateObject private var authManager = AuthManager()
    @StateObject private var feedManager = FeedManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(feedManager)
        }
    }
}

