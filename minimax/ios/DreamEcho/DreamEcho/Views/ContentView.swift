import SwiftUI

// MARK: - Content View

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            if authManager.isAuthenticated {
                HomeView()
                    .tabItem {
                        Label("首页", systemImage: "house.fill")
                    }
                    .tag(0)
                
                SearchView()
                    .tabItem {
                        Label("发现", systemImage: "magnifyingglass")
                    }
                    .tag(1)
                
                SubscriptionsView()
                    .tabItem {
                        Label("订阅", systemImage: "star.fill")
                    }
                    .tag(2)
                
                ProfileView()
                    .tabItem {
                        Label("我的", systemImage: "person.fill")
                    }
                    .tag(3)
            } else {
                LoginView()
                    .tabItem {
                        Label("登录", systemImage: "person.circle.fill")
                    }
                    .tag(0)
            }
        }
        .tint(.purple)
    }
}

// MARK: - Login View

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var username = ""
    @State private var password = ""
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Spacer()
                
                // Logo
                VStack(spacing: 20) {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .font(.system(size: 80))
                        .foregroundStyle(.purple.gradient)
                    
                    Text("DreamEcho")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("听播客，上DreamEcho")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Login Form
                VStack(spacing: 20) {
                    TextField("用户名", text: $username)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.username)
                        .autocapitalization(.none)
                    
                    SecureField("密码", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.password)
                    
                    if let error = authManager.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                    
                    Button(action: login) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("登录")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(username.isEmpty || password.isEmpty ? Color.gray : Color.purple)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(username.isEmpty || password.isEmpty || isLoading)
                }
                .padding(.horizontal, 40)
                
                Spacer()
            }
            .navigationBarHidden(true)
        }
    }
    
    private func login() {
        isLoading = true
        Task {
            await authManager.login(username: username, password: password)
            await MainActor.run {
                isLoading = false
            }
        }
    }
}

// MARK: - Home View

struct HomeView: View {
    @EnvironmentObject var feedManager: FeedManager
    @State private var selectedPodcast: Podcast?
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Featured Section
                    if !feedManager.popularPodcasts.isEmpty {
                        VStack(alignment: .leading, spacing: 15) {
                            Text("热门播客")
                                .font(.title2)
                                .fontWeight(.bold)
                                .padding(.horizontal)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    ForEach(feedManager.popularPodcasts) { podcast in
                                        PodcastCard(podcast: podcast)
                                            .onTapGesture {
                                                selectedPodcast = podcast
                                            }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }
                    
                    // Subscriptions Section
                    if !feedManager.subscriptions.isEmpty {
                        VStack(alignment: .leading, spacing: 15) {
                            Text("我的订阅")
                                .font(.title2)
                                .fontWeight(.bold)
                                .padding(.horizontal)
                            
                            ForEach(feedManager.subscriptions) { podcast in
                                SubscriptionRow(podcast: podcast)
                            }
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("DreamEcho")
            .refreshable {
                // Refresh logic
            }
        }
        .sheet(item: $selectedPodcast) { podcast in
            PodcastDetailView(podcast: podcast)
        }
    }
}

// MARK: - Podcast Card

struct PodcastCard: View {
    let podcast: Podcast
    @EnvironmentObject var feedManager: FeedManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            AsyncImage(url: URL(string: podcast.imageURL ?? "")) { phase in
                switch phase {
                case .empty:
                    Rectangle()
                        .fill(Color.purple.opacity(0.2))
                        .overlay(
                            Text(podcast.title.prefix(1))
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.purple)
                        )
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    Rectangle()
                        .fill(Color.purple.opacity(0.2))
                        .overlay(
                            Text(podcast.title.prefix(1))
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.purple)
                        )
                @unknown default:
                    EmptyView()
                }
            }
            .frame(width: 150, height: 150)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            
            Text(podcast.title)
                .font(.subheadline)
                .fontWeight(.medium)
                .lineLimit(2)
                .frame(width: 150, alignment: .leading)
        }
    }
}

// MARK: - Subscription Row

struct SubscriptionRow: View {
    let podcast: Podcast
    
    var body: some View {
        HStack(spacing: 16) {
            AsyncImage(url: URL(string: podcast.imageURL ?? "")) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                default:
                    Circle()
                        .fill(Color.purple.opacity(0.2))
                        .overlay(
                            Text(podcast.title.prefix(1))
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.purple)
                        )
                }
            }
            .frame(width: 60, height: 60)
            .clipShape(Circle())
            
            VStack(alignment: .leading, spacing: 4) {
                Text(podcast.title)
                    .font(.headline)
                Text(podcast.author)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

// MARK: - Podcast Detail View

struct PodcastDetailView: View {
    let podcast: Podcast
    @EnvironmentObject var feedManager: FeedManager
    @State private var feed: FeedResponse?
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView()
                } else if let feed = feed {
                    List(feed.items) { episode in
                        EpisodeRow(episode: episode)
                    }
                    .listStyle(.plain)
                } else {
                    ContentUnavailableView(
                        "暂无内容",
                        systemImage: "antenna.radiowaves.left.and.right",
                        description: Text("点击刷新获取播客单集")
                    )
                }
            }
            .navigationTitle(podcast.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("刷新") {
                        loadFeed()
                    }
                }
            }
        }
        .task {
            loadFeed()
        }
    }
    
    private func loadFeed() {
        isLoading = true
        Task {
            if let response = await feedManager.fetchFeed(podcast: podcast) {
                await MainActor.run {
                    feed = response
                    isLoading = false
                }
            } else {
                await MainActor.run {
                    isLoading = false
                }
            }
        }
    }
}

// MARK: - Episode Row

struct EpisodeRow: View {
    let episode: Episode
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(episode.title)
                .font(.headline)
                .lineLimit(2)
            
            Text(episode.description)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            HStack(spacing: 16) {
                if let duration = episode.duration {
                    Label(duration, systemImage: "clock")
                }
                Text(episode.pubDate)
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Search View

struct SearchView: View {
    @EnvironmentObject var feedManager: FeedManager
    @State private var searchText = ""
    @State private var selectedPodcast: Podcast?
    
    var filteredPodcasts: [Podcast] {
        if searchText.isEmpty {
            return feedManager.popularPodcasts
        }
        return feedManager.popularPodcasts.filter {
            $0.title.localizedCaseInsensitiveContains(searchText) ||
            $0.description.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    var body: some View {
        NavigationView {
            List(filteredPodcasts) { podcast in
                SubscriptionRow(podcast: podcast)
                    .onTapGesture {
                        selectedPodcast = podcast
                    }
            }
            .listStyle(.plain)
            .navigationTitle("发现")
            .searchable(text: $searchText, prompt: "搜索播客")
        }
        .sheet(item: $selectedPodcast) { podcast in
            PodcastDetailView(podcast: podcast)
        }
    }
}

// MARK: - Subscriptions View

struct SubscriptionsView: View {
    @EnvironmentObject var feedManager: FeedManager
    
    var body: some View {
        NavigationView {
            Group {
                if feedManager.subscriptions.isEmpty {
                    ContentUnavailableView(
                        "暂无订阅",
                        systemImage: "star",
                        description: Text("去发现页面添加订阅")
                    )
                } else {
                    List(feedManager.subscriptions) { podcast in
                        SubscriptionRow(podcast: podcast)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("订阅")
        }
    }
}

// MARK: - Profile View

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        NavigationView {
            List {
                Section {
                    HStack(spacing: 16) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.purple)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(authManager.currentUser?.username ?? "用户")
                                .font(.headline)
                            Text("普通会员")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                Section("设置") {
                    NavigationLink {
                        Text("播放设置")
                    } label: {
                        Label("播放设置", systemImage: "play.circle")
                    }
                    
                    NavigationLink {
                        Text("下载管理")
                    } label: {
                        Label("下载管理", systemImage: "arrow.down.circle")
                    }
                    
                    NavigationLink {
                        Text("夜间模式")
                    } label: {
                        Label("夜间模式", systemImage: "moon")
                    }
                }
                
                Section {
                    Button(role: .destructive) {
                        authManager.logout()
                    } label: {
                        Label("退出登录", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("我的")
        }
    }
}

// MARK: - Identifiable Extension

extension Podcast: Identifiable {}

