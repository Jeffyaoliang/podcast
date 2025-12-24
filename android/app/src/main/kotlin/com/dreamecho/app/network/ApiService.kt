package com.dreamecho.app.network

import com.dreamecho.app.models.AuthResponse
import com.dreamecho.app.models.FeedResponse
import com.dreamecho.app.models.LoginRequest
import okhttp3.OkHttpClient
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

// API Interface
interface ApiService {
    @POST("/api/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse
    
    @GET("/api/feed")
    suspend fun getFeed(@Query("url") url: String): FeedResponse
    
    @GET("/api/profile")
    suspend fun getProfile(): Map<String, String>
    
    @GET("/api/subscriptions")
    suspend fun getSubscriptions(): Map<String, Boolean>
    
    @POST("/api/subscriptions")
    suspend fun addSubscription(@Body request: Map<String, String>)
    
    @DELETE("/api/subscriptions/{url}")
    suspend fun removeSubscription(@Path("url") url: String)
}

// Retrofit instance
object RetrofitClient {
    private const val BASE_URL = "http://10.0.2.2:8080/"
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val apiService: ApiService = retrofit.create(ApiService::class.java)
}

// Auth token manager
object AuthTokenManager {
    private var token: String? = null
    
    fun setToken(newToken: String?) {
        token = newToken
    }
    
    fun getToken(): String? = token
    
    fun clearToken() {
        token = null
    }
}

