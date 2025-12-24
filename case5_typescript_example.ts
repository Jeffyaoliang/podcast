// API响应基础类型
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

// API错误类型
class ApiError extends Error {
  constructor(
    public code: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// HTTP请求配置
interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retry?: number;
  retryDelay?: number;
}

// API客户端配置
interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  interceptor?: {
    request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
    response?: <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;
    error?: (error: ApiError) => ApiError | Promise<ApiError>;
  };
}

// 类型安全的API客户端
class ApiClient {
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig) {
    this.config = {
      baseURL: config.baseURL,
      timeout: config.timeout ?? 10000,
      headers: config.headers ?? {},
      interceptor: config.interceptor ?? {},
    };
  }

  // GET请求
  async get<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: RequestConfig
  ): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const fullUrl = `${this.config.baseURL}${url}${queryString}`;

    return this.request<T>(fullUrl, {
      method: 'GET',
      ...config,
    });
  }

  // POST请求
  async post<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(`${this.config.baseURL}${url}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      ...config,
    });
  }

  // PUT请求
  async put<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(`${this.config.baseURL}${url}`, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      ...config,
    });
  }

  // DELETE请求
  async delete<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(`${this.config.baseURL}${url}`, {
      method: 'DELETE',
      ...config,
    });
  }

  // 通用请求方法
  private async request<T>(
    url: string,
    options: RequestInit & RequestConfig
  ): Promise<T> {
    let requestConfig: RequestInit & RequestConfig = {
      headers: {
        ...this.config.headers,
        ...options.headers,
      },
      ...options,
    };

    // 请求拦截器
    if (this.config.interceptor.request) {
      requestConfig = await this.config.interceptor.request(requestConfig);
    }

    // 执行请求（带重试逻辑）
    const maxRetries = options.retry ?? 0;
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          options.timeout ?? this.config.timeout
        );

        const response = await fetch(url, {
          ...requestConfig,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseData: ApiResponse<T> = await response.json();

        // 响应拦截器
        if (this.config.interceptor.response) {
          const processedResponse = await this.config.interceptor.response<T>(
            responseData
          );
          return processedResponse.data;
        }

        // 检查业务错误
        if (responseData.code !== 200) {
          const error = new ApiError(
            responseData.code,
            responseData.message,
            responseData.data
          );

          // 错误拦截器
          if (this.config.interceptor.error) {
            throw await this.config.interceptor.error(error);
          }

          throw error;
        }

        return responseData.data;
      } catch (error) {
        lastError =
          error instanceof ApiError
            ? error
            : new ApiError(
                500,
                error instanceof Error ? error.message : 'Unknown error'
              );

        // 如果是最后一次尝试，抛出错误
        if (attempt === maxRetries) {
          if (this.config.interceptor.error) {
            throw await this.config.interceptor.error(lastError);
          }
          throw lastError;
        }

        // 等待后重试
        if (options.retryDelay) {
          await new Promise((resolve) =>
            setTimeout(resolve, options.retryDelay)
          );
        }
      }
    }

    throw lastError!;
  }
}

// 用户相关API类型定义
interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

interface UserListParams {
  page: number;
  pageSize: number;
  keyword?: string;
}

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
  avatar?: string;
}

// 用户API服务（类型安全）
class UserApiService {
  constructor(private client: ApiClient) {}

  // 获取用户列表（完全类型安全）
  async getUserList(params: UserListParams): Promise<UserListResponse> {
    return this.client.get<UserListResponse>('/users', params);
  }

  // 获取用户详情
  async getUserById(id: number): Promise<User> {
    return this.client.get<User>(`/users/${id}`);
  }

  // 创建用户
  async createUser(data: CreateUserRequest): Promise<User> {
    return this.client.post<User, CreateUserRequest>('/users', data);
  }

  // 更新用户
  async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    return this.client.put<User, UpdateUserRequest>(`/users/${id}`, data);
  }

  // 删除用户
  async deleteUser(id: number): Promise<void> {
    return this.client.delete<void>(`/users/${id}`);
  }
}

// 使用示例
async function example() {
  // 创建API客户端
  const apiClient = new ApiClient({
    baseURL: 'https://api.example.com',
    timeout: 10000,
    headers: {
      'Authorization': 'Bearer token',
    },
    interceptor: {
      request: (config) => {
        console.log('Request:', config);
        return config;
      },
      response: <T>(response: ApiResponse<T>) => {
        console.log('Response:', response);
        return response;
      },
      error: (error) => {
        console.error('Error:', error);
        return error;
      },
    },
  });

  // 创建用户API服务
  const userApi = new UserApiService(apiClient);

  try {
    // 类型安全的API调用
    const userList = await userApi.getUserList({
      page: 1,
      pageSize: 20,
      keyword: 'test',
    });

    // TypeScript会自动推断类型
    console.log(userList.users[0].name); // ✅ 类型安全
    console.log(userList.total); // ✅ 类型安全

    // 创建用户（类型检查）
    const newUser = await userApi.createUser({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    console.log(newUser.id); // ✅ 类型安全

    // 更新用户（可选字段）
    const updatedUser = await userApi.updateUser(newUser.id, {
      name: 'Jane Doe',
      // email 和 avatar 是可选的
    });

    console.log(updatedUser.name); // ✅ 类型安全
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error:', error.code, error.message);
    } else {
      console.error('Unknown error:', error);
    }
  }
}

// 导出
export { ApiClient, ApiError, UserApiService };
export type {
  ApiResponse,
  RequestConfig,
  ApiClientConfig,
  User,
  UserListParams,
  UserListResponse,
  CreateUserRequest,
  UpdateUserRequest,
};

