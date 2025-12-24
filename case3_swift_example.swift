import SwiftUI
import Combine

// 用户模型
struct User: Codable, Identifiable {
    let id: Int
    let name: String
    let email: String
    let avatar: String?
}

// 网络错误类型
enum NetworkError: Error, LocalizedError {
    case invalidURL
    case noData
    case decodingError
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .decodingError:
            return "Failed to decode response"
        case .serverError(let message):
            return "Server error: \(message)"
        }
    }
}

// 加载状态
enum LoadingState {
    case idle
    case loading
    case loaded
    case error(Error)
}

// ViewModel
class UserListViewModel: ObservableObject {
    @Published var users: [User] = []
    @Published var loadingState: LoadingState = .idle
    @Published var isLoadingMore: Bool = false
    @Published var hasMore: Bool = true
    
    private var currentPage: Int = 1
    private let pageSize: Int = 20
    private var cancellables = Set<AnyCancellable>()
    private let networkService: NetworkServiceProtocol
    
    init(networkService: NetworkServiceProtocol = NetworkService()) {
        self.networkService = networkService
    }
    
    // 加载用户列表
    func loadUsers(refresh: Bool = false) {
        if refresh {
            currentPage = 1
            users = []
            hasMore = true
        }
        
        guard !isLoadingMore, hasMore else { return }
        
        if currentPage == 1 {
            loadingState = .loading
        } else {
            isLoadingMore = true
        }
        
        networkService.fetchUsers(page: currentPage, pageSize: pageSize)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    guard let self = self else { return }
                    self.isLoadingMore = false
                    
                    if case .failure(let error) = completion {
                        self.loadingState = .error(error)
                    }
                },
                receiveValue: { [weak self] response in
                    guard let self = self else { return }
                    
                    if refresh {
                        self.users = response.users
                    } else {
                        self.users.append(contentsOf: response.users)
                    }
                    
                    self.hasMore = response.users.count >= self.pageSize
                    self.currentPage += 1
                    self.loadingState = .loaded
                }
            )
            .store(in: &cancellables)
    }
    
    // 加载更多
    func loadMore() {
        loadUsers()
    }
    
    // 刷新
    func refresh() {
        loadUsers(refresh: true)
    }
}

// 网络服务协议
protocol NetworkServiceProtocol {
    func fetchUsers(page: Int, pageSize: Int) -> AnyPublisher<UserListResponse, Error>
}

// 用户列表响应
struct UserListResponse: Codable {
    let users: [User]
    let total: Int
}

// 网络服务实现
class NetworkService: NetworkServiceProtocol {
    private let baseURL = "https://api.example.com"
    private let session: URLSession
    
    init(session: URLSession = .shared) {
        self.session = session
    }
    
    func fetchUsers(page: Int, pageSize: Int) -> AnyPublisher<UserListResponse, Error> {
        guard let url = URL(string: "\(baseURL)/users?page=\(page)&pageSize=\(pageSize)") else {
            return Fail(error: NetworkError.invalidURL)
                .eraseToAnyPublisher()
        }
        
        return session.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: UserListResponse.self, decoder: JSONDecoder())
            .mapError { error -> Error in
                if error is DecodingError {
                    return NetworkError.decodingError
                }
                return NetworkError.serverError(error.localizedDescription)
            }
            .eraseToAnyPublisher()
    }
}

// SwiftUI视图
struct UserListView: View {
    @StateObject private var viewModel = UserListViewModel()
    
    var body: some View {
        NavigationView {
            ZStack {
                switch viewModel.loadingState {
                case .idle, .loading:
                    if viewModel.users.isEmpty {
                        ProgressView()
                            .scaleEffect(1.5)
                    } else {
                        userList
                    }
                    
                case .loaded:
                    userList
                    
                case .error(let error):
                    ErrorView(error: error) {
                        viewModel.refresh()
                    }
                }
            }
            .navigationTitle("用户列表")
            .refreshable {
                await viewModel.refreshAsync()
            }
            .onAppear {
                if viewModel.users.isEmpty {
                    viewModel.loadUsers()
                }
            }
        }
    }
    
    private var userList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(viewModel.users) { user in
                    UserRowView(user: user)
                }
                
                // 加载更多指示器
                if viewModel.isLoadingMore {
                    ProgressView()
                        .padding()
                }
                
                // 加载更多触发器
                if viewModel.hasMore && !viewModel.isLoadingMore {
                    Color.clear
                        .frame(height: 1)
                        .onAppear {
                            viewModel.loadMore()
                        }
                }
            }
            .padding()
        }
    }
}

// 用户行视图
struct UserRowView: View {
    let user: User
    
    var body: some View {
        HStack(spacing: 12) {
            // 头像
            AsyncImage(url: URL(string: user.avatar ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(Color.gray.opacity(0.3))
            }
            .frame(width: 50, height: 50)
            .clipShape(Circle())
            
            // 用户信息
            VStack(alignment: .leading, spacing: 4) {
                Text(user.name)
                    .font(.headline)
                Text(user.email)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
}

// 错误视图
struct ErrorView: View {
    let error: Error
    let retryAction: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundColor(.orange)
            
            Text("加载失败")
                .font(.headline)
            
            Text(error.localizedDescription)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button(action: retryAction) {
                Text("重试")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .cornerRadius(8)
            }
        }
    }
}

// ViewModel扩展：支持async/await
extension UserListViewModel {
    func refreshAsync() async {
        await withCheckedContinuation { continuation in
            refresh()
            // 简化处理，实际应该等待加载完成
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                continuation.resume()
            }
        }
    }
}

// 预览
struct UserListView_Previews: PreviewProvider {
    static var previews: some View {
        UserListView()
    }
}

