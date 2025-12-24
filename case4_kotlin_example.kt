import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.launch

// 数据模型
data class User(
    val id: Int,
    val name: String,
    val email: String,
    val avatar: String?
)

// UI状态
sealed class UiState<out T> {
    object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}

// 用户列表状态
data class UserListState(
    val users: List<User> = emptyList(),
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val error: String? = null,
    val hasMore: Boolean = true
)

// 网络错误
sealed class NetworkError : Exception() {
    object NoConnection : NetworkError()
    object ServerError : NetworkError()
    data class UnknownError(val message: String) : NetworkError()
}

// Repository接口
interface UserRepository {
    suspend fun getUsers(page: Int, pageSize: Int): Result<List<User>>
    suspend fun getUserById(id: Int): Result<User>
}

// Repository实现
class UserRepositoryImpl(
    private val apiService: ApiService
) : UserRepository {
    override suspend fun getUsers(page: Int, pageSize: Int): Result<List<User>> {
        return try {
            val response = apiService.getUsers(page, pageSize)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.users)
            } else {
                Result.failure(NetworkError.ServerError)
            }
        } catch (e: Exception) {
            Result.failure(
                if (e is java.net.UnknownHostException) {
                    NetworkError.NoConnection
                } else {
                    NetworkError.UnknownError(e.message ?: "Unknown error")
                }
            )
        }
    }

    override suspend fun getUserById(id: Int): Result<User> {
        return try {
            val response = apiService.getUserById(id)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(NetworkError.ServerError)
            }
        } catch (e: Exception) {
            Result.failure(
                if (e is java.net.UnknownHostException) {
                    NetworkError.NoConnection
                } else {
                    NetworkError.UnknownError(e.message ?: "Unknown error")
                }
            )
        }
    }
}

// ViewModel
class UserListViewModel(
    private val repository: UserRepository = UserRepositoryImpl(ApiServiceImpl())
) : ViewModel() {

    private val _uiState = MutableStateFlow<UserListState>(UserListState())
    val uiState: StateFlow<UserListState> = _uiState.asStateFlow()

    private var currentPage = 1
    private val pageSize = 20

    init {
        loadUsers()
    }

    // 加载用户列表
    fun loadUsers() {
        if (_uiState.value.isLoading) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                error = null
            )

            repository.getUsers(currentPage, pageSize)
                .onSuccess { users ->
                    _uiState.value = _uiState.value.copy(
                        users = if (currentPage == 1) users else _uiState.value.users + users,
                        isLoading = false,
                        hasMore = users.size >= pageSize
                    )
                    currentPage++
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = when (error) {
                            is NetworkError.NoConnection -> "网络连接失败，请检查网络设置"
                            is NetworkError.ServerError -> "服务器错误，请稍后重试"
                            is NetworkError.UnknownError -> error.message
                            else -> "未知错误"
                        }
                    )
                }
        }
    }

    // 加载更多
    fun loadMore() {
        if (_uiState.value.isLoadingMore || !_uiState.value.hasMore) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingMore = true)

            repository.getUsers(currentPage, pageSize)
                .onSuccess { users ->
                    _uiState.value = _uiState.value.copy(
                        users = _uiState.value.users + users,
                        isLoadingMore = false,
                        hasMore = users.size >= pageSize
                    )
                    currentPage++
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoadingMore = false,
                        error = when (error) {
                            is NetworkError.NoConnection -> "加载更多失败：网络连接失败"
                            is NetworkError.ServerError -> "加载更多失败：服务器错误"
                            is NetworkError.UnknownError -> error.message
                            else -> "加载更多失败：未知错误"
                        }
                    )
                }
        }
    }

    // 刷新
    fun refresh() {
        currentPage = 1
        _uiState.value = UserListState()
        loadUsers()
    }

    // 使用Flow的替代实现（展示Flow的使用）
    fun loadUsersFlow() = flow {
        emit(UiState.Loading)
        
        repository.getUsers(currentPage, pageSize)
            .onSuccess { users ->
                emit(UiState.Success(users))
            }
            .onFailure { error ->
                emit(UiState.Error(error.message ?: "Unknown error"))
            }
    }.catch { e ->
        emit(UiState.Error(e.message ?: "Unknown error"))
    }
}

// API服务接口
interface ApiService {
    suspend fun getUsers(page: Int, pageSize: Int): retrofit2.Response<UserListResponse>
    suspend fun getUserById(id: Int): retrofit2.Response<User>
}

// API响应模型
data class UserListResponse(
    val users: List<User>,
    val total: Int
)

// API服务实现（使用Retrofit，这里简化展示）
class ApiServiceImpl : ApiService {
    override suspend fun getUsers(page: Int, pageSize: Int): retrofit2.Response<UserListResponse> {
        // 实际实现会使用Retrofit进行网络请求
        // 这里仅作示例
        return retrofit2.Response.success(
            UserListResponse(
                users = emptyList(),
                total = 0
            )
        )
    }

    override suspend fun getUserById(id: Int): retrofit2.Response<User> {
        // 实际实现会使用Retrofit进行网络请求
        return retrofit2.Response.success(
            User(
                id = id,
                name = "Test User",
                email = "test@example.com",
                avatar = null
            )
        )
    }
}

// Result扩展函数
fun <T> Result<T>.onSuccess(action: (value: T) -> Unit): Result<T> {
    if (isSuccess) action(getOrThrow())
    return this
}

fun <T> Result<T>.onFailure(action: (exception: Throwable) -> Unit): Result<T> {
    if (isFailure) action(exceptionOrNull()!!)
    return this
}

