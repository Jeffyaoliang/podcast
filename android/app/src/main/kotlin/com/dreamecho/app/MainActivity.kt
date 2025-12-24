package com.dreamecho.app

import android.util.Log
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.material3.Surface
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.dreamecho.app.models.Podcast
import com.dreamecho.app.network.RetrofitClient
import com.dreamecho.app.ui.screens.HomeScreen
import com.dreamecho.app.ui.screens.LoginScreen
import com.dreamecho.app.ui.screens.PodcastDetailScreen
import com.dreamecho.app.ui.screens.ProfileScreen
import com.dreamecho.app.ui.screens.SearchScreen
import com.dreamecho.app.ui.screens.SubscriptionsScreen
import com.dreamecho.app.ui.theme.DreamEchoTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DreamEchoTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    DreamEchoApp()
                }
            }
        }
    }
}

@Composable
fun DreamEchoApp() {
    val navController = rememberNavController()
    var isLoggedIn by remember { mutableStateOf(false) }
    
    NavHost(
        navController = navController,
        startDestination = if (isLoggedIn) "home" else "login"
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    isLoggedIn = true
                    navController.navigate("home") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }
        
        composable("home") {
            HomeScreen(
                onPodcastClick = { podcast ->
                    Log.d("Navigation", "点击播客: ${podcast.title}")
                    val encodedUrl = java.net.URLEncoder.encode(podcast.rssUrl, "UTF-8")
                    Log.d("Navigation", "编码后URL: $encodedUrl")
                    navController.navigate("podcast/$encodedUrl")
                },
                onLogout = {
                    isLoggedIn = false
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable("search") {
            SearchScreen(
                onPodcastClick = { podcast ->
                    Log.d("Navigation", "点击播客: ${podcast.title}")
                    val encodedUrl = java.net.URLEncoder.encode(podcast.rssUrl, "UTF-8")
                    navController.navigate("podcast/$encodedUrl")
                }
            )
        }

        composable("podcast/{rssUrl}") { backStackEntry ->
            val encodedRssUrl = backStackEntry.arguments?.getString("rssUrl") ?: ""
            Log.d("Navigation", "收到RSS URL: $encodedRssUrl")
            
            val rssUrl = try {
                java.net.URLDecoder.decode(encodedRssUrl, "UTF-8")
            } catch (e: Exception) {
                Log.e("Navigation", "URL解码失败", e)
                encodedRssUrl
            }
            
            Log.d("Navigation", "解码后RSS URL: $rssUrl")

            var podcast: Podcast? by androidx.compose.runtime.remember { mutableStateOf(null) }
            var isLoading by androidx.compose.runtime.remember { mutableStateOf(true) }
            var errorMessage by androidx.compose.runtime.remember { mutableStateOf<String?>(null) }

            Log.d("Navigation", "开始 LaunchedEffect")

            // Fetch podcast info
            androidx.compose.runtime.LaunchedEffect(rssUrl) {
                Log.d("API", "LaunchedEffect 开始执行")
                try {
                    errorMessage = null
                    val encodedUrl = java.net.URLEncoder.encode(rssUrl, "UTF-8")
                    Log.d("API", "开始请求API: http://10.0.2.2:8080/api/feed?url=$encodedUrl")
                    
                    val response = RetrofitClient.apiService.getFeed(rssUrl)
                    Log.d("API", "API请求成功: ${response.title}")
                    
                    podcast = Podcast(
                        id = System.currentTimeMillis().toString(),
                        title = response.title,
                        description = response.description,
                        imageUrl = response.image,
                        author = response.author ?: "未知作者",
                        rssUrl = rssUrl,
                        link = response.link
                    )
                    Log.d("API", "Podcast对象创建成功")
                } catch (e: Exception) {
                    Log.e("API", "API请求失败: ${e.javaClass.simpleName}", e)
                    errorMessage = "错误: ${e.javaClass.simpleName}\n${e.message ?: "未知错误"}\n\nURL: $rssUrl"
                } finally {
                    Log.d("API", "LaunchedEffect 执行完毕, isLoading=false")
                    isLoading = false
                }
            }

            Log.d("Navigation", "Composable 重组完成, isLoading=$isLoading, podcast=${podcast?.title}")

            if (isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (errorMessage != null) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "加载失败",
                        style = MaterialTheme.typography.headlineSmall,
                        color = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = errorMessage!!,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    FilledIconButton(
                        onClick = { navController.popBackStack() }
                    ) {
                        Text("返回")
                    }
                }
            } else if (podcast != null) {
                PodcastDetailScreen(
                    podcast = podcast!!,
                    onBack = { navController.popBackStack() }
                )
            }
        }
        
        composable("subscriptions") {
            SubscriptionsScreen()
        }
        
        composable("profile") {
            ProfileScreen(
                onLogout = {
                    isLoggedIn = false
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}

