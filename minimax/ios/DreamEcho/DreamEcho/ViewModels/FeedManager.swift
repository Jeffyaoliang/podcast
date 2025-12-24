import Foundation
import SwiftUI

// MARK: - Feed Manager

class FeedManager: ObservableObject {
    @Published var subscriptions: [Podcast] = []
    @Published var recentFeeds: [String: FeedResponse] = [:]
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Popular podcasts
    let popularPodcasts: [Podcast] = [
        Podcast(
            title: "内核恐慌",
            description: "一档号称硬核却没什么干货的信息技术主题娱乐节目",
            imageURL: nil,
            author: "内核恐慌",
            rssURL: "https://pan.icu/feed",
            link: "https://pan.icu/"
        ),
        Podcast(
            title: "Teahour",
            description: "聚焦于程序、创业以及一切 Geek 话题的中文播客",
            imageURL: nil,
            author: "Teahour",
            rssURL: "https://feeds.fireside.fm/teahour/rss",
            link: "https://teahour.fm/"
        ),
        Podcast(
            title: "NPR News Now",
            description: "The latest news in five minutes. Updated hourly.",
            imageURL: nil,
            author: "NPR",
            rssURL: "https://feeds.npr.org/500005/podcast.xml",
            link: "https://www.npr.org/"
        ),
        Podcast(
            title: "Wait Wait... Don't Tell Me!",
            description: "NPR的新闻问答访谈节目",
            imageURL: nil,
            author: "NPR",
            rssURL: "https://feeds.npr.org/344098539/podcast.xml",
            link: "https://www.npr.org/programs/wait-wait/"
        ),
        Podcast(
            title: "Fresh Air",
            description: "NPR深度访谈节目",
            imageURL: nil,
            author: "NPR",
            rssURL: "https://feeds.npr.org/381444908/podcast.xml",
            link: "https://www.npr.org/programs/fresh-air/"
        )
    ]
    
    func fetchFeed(podcast: Podcast) async -> FeedResponse? {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        // Check cache first
        if let cached = recentFeeds[podcast.rssURL] {
            await MainActor.run {
                isLoading = false
            }
            return cached
        }
        
        do {
            let feed = try await APIService.shared.fetchFeed(url: podcast.rssURL)
            
            await MainActor.run {
                recentFeeds[podcast.rssURL] = feed
                isLoading = false
            }
            
            return feed
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                isLoading = false
            }
            return nil
        }
    }
    
    func addSubscription(_ podcast: Podcast) async {
        do {
            try await APIService.shared.addSubscription(url: podcast.rssURL)
            
            await MainActor.run {
                if !subscriptions.contains(where: { $0.rssURL == podcast.rssURL }) {
                    subscriptions.append(podcast)
                }
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    func removeSubscription(_ podcast: Podcast) async {
        do {
            try await APIService.shared.removeSubscription(url: podcast.rssURL)
            
            await MainActor.run {
                subscriptions.removeAll { $0.rssURL == podcast.rssURL }
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    func isSubscribed(_ podcast: Podcast) -> Bool {
        subscriptions.contains { $0.rssURL == podcast.rssURL }
    }
}

