package com.dreamecho.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.dreamecho.app.models.Podcast
import com.dreamecho.app.network.RetrofitClient
import kotlinx.coroutines.launch

// Sample podcasts data
val samplePodcasts = listOf(
    Podcast(
        id = "1",
        title = "内核恐慌",
        description = "一档号称硬核却没什么干货的信息技术主题娱乐节目",
        imageUrl = null,
        author = "内核恐慌",
        rssUrl = "https://pan.icu/feed",
        link = "https://pan.icu/"
    ),
    Podcast(
        id = "2",
        title = "Teahour",
        description = "聚焦于程序、创业以及一切 Geek 话题的中文播客",
        imageUrl = null,
        author = "Teahour",
        rssUrl = "https://feeds.fireside.fm/teahour/rss",
        link = "https://teahour.fm/"
    ),
    Podcast(
        id = "3",
        title = "NPR News Now",
        description = "The latest news in five minutes. Updated hourly.",
        imageUrl = null,
        author = "NPR",
        rssUrl = "https://feeds.npr.org/500005/podcast.xml",
        link = "https://www.npr.org/"
    ),
    Podcast(
        id = "4",
        title = "Fresh Air",
        description = "NPR深度访谈节目",
        imageUrl = null,
        author = "NPR",
        rssUrl = "https://feeds.npr.org/381444908/podcast.xml",
        link = "https://www.npr.org/programs/fresh-air/"
    ),
    Podcast(
        id = "5",
        title = "Wait Wait... Don't Tell Me!",
        description = "NPR的新闻问答访谈节目",
        imageUrl = null,
        author = "NPR",
        rssUrl = "https://feeds.npr.org/344098539/podcast.xml",
        link = "https://www.npr.org/programs/wait-wait/"
    )
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onPodcastClick: (Podcast) -> Unit,
    onLogout: () -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var podcasts by remember { mutableStateOf<List<Podcast>>(emptyList()) }
    val coroutineScope = rememberCoroutineScope()

    // Fetch podcasts from API on first composition
    LaunchedEffect(Unit) {
        try {
            val feeds = listOf(
                "https://pan.icu/feed" to "内核恐慌",
                "https://feeds.fireside.fm/teahour/rss" to "Teahour",
                "https://feeds.npr.org/500005/podcast.xml" to "NPR News",
                "https://feeds.fireside.fm/richards-apartment/rss" to "疯投圈"
            )

            val podcastList = mutableListOf<Podcast>()
            feeds.forEach { (url, fallbackTitle) ->
                try {
                    val response = RetrofitClient.apiService.getFeed(url)
                    podcastList.add(
                        Podcast(
                            id = System.currentTimeMillis().toString() + url.hashCode(),
                            title = response.title,
                            description = response.description,
                            imageUrl = response.image,
                            author = response.author ?: fallbackTitle,
                            rssUrl = url,
                            link = response.link
                        )
                    )
                } catch (e: Exception) {
                    // Skip failed feeds
                }
            }
            podcasts = podcastList.ifEmpty { samplePodcasts }
        } catch (e: Exception) {
            e.printStackTrace()
            // Use sample data on error
            podcasts = samplePodcasts
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "DreamEcho",
                        fontWeight = FontWeight.Bold
                    )
                },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(
                            imageVector = Icons.Default.Logout,
                            contentDescription = "退出登录"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Popular Podcasts Section
            item {
                Text(
                    text = "热门播客",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            }
            
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(podcasts) { podcast ->
                        PodcastCard(
                            podcast = podcast,
                            onClick = { onPodcastClick(podcast) }
                        )
                    }
                }
            }
            
            // Subscriptions Section
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "我的订阅",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            }
            
            // Placeholder for subscriptions
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "暂无订阅，去发现页面添加",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
        }
    }
}

@Composable
fun PodcastCard(
    podcast: Podcast,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(150.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column {
            // Show placeholder only when imageUrl is null or empty
            if (podcast.imageUrl.isNullOrBlank()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
                        .background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = podcast.title.firstOrNull()?.toString() ?: "?",
                        style = MaterialTheme.typography.headlineLarge,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            } else {
                AsyncImage(
                    model = podcast.imageUrl,
                    contentDescription = podcast.title,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)),
                    contentScale = ContentScale.Crop
                )
            }
            
            Column(
                modifier = Modifier.padding(12.dp)
            ) {
                Text(
                    text = podcast.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = podcast.author,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

