package com.dreamecho.app.ui.screens

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.ToneGenerator
import android.media.AudioManager
import android.util.Log
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.dreamecho.app.models.Episode
import com.dreamecho.app.models.Podcast
import com.dreamecho.app.network.RetrofitClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PodcastDetailScreen(
    podcast: Podcast,
    onBack: () -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var episodes by remember { mutableStateOf<List<Episode>>(emptyList()) }
    var isPlaying by remember { mutableStateOf(false) }
    var currentEpisode by remember { mutableStateOf<Episode?>(null) }
    
    // Audio player
    val mediaPlayer = remember { MediaPlayer() }
    var currentPosition by remember { mutableStateOf(0) }
    var duration by remember { mutableStateOf(0) }
    var sliderPosition by remember { mutableStateOf(0f) }
    var isSliding by remember { mutableStateOf(false) }
    
    // Tone generator for seek feedback sound
    val toneGenerator = remember { ToneGenerator(AudioManager.STREAM_MUSIC, 80) }

    // Fetch episodes from API
    CoroutineScope(Dispatchers.IO).launch {
        try {
            val response = RetrofitClient.apiService.getFeed(podcast.rssUrl)
            episodes = response.items
        } catch (e: Exception) {
            Log.e("PodcastDetail", "获取节目列表失败", e)
        } finally {
            withContext(Dispatchers.Main) {
                isLoading = false
            }
        }
    }

    // Handle playback state
    DisposableEffect(currentEpisode, isPlaying) {
        Log.d("Audio", "DisposableEffect 触发: episode=${currentEpisode?.title}, isPlaying=$isPlaying")
        
        if (currentEpisode != null && isPlaying) {
            val audioUrl = currentEpisode!!.audioUrl
            Log.d("Audio", "音频URL: $audioUrl")
            
            if (!audioUrl.isNullOrBlank()) {
                try {
                    Log.d("Audio", "开始设置MediaPlayer...")
                    mediaPlayer.reset()
                    mediaPlayer.setDataSource(audioUrl)
                    mediaPlayer.setAudioAttributes(
                        AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .build()
                    )
                    mediaPlayer.setOnPreparedListener { mp ->
                        Log.d("Audio", "MediaPlayer准备完成，开始播放")
                        duration = mp.duration
                        sliderPosition = 0f
                        mp.start()
                    }
                    mediaPlayer.setOnCompletionListener {
                        Log.d("Audio", "播放完成")
                        isPlaying = false
                        currentPosition = 0
                        sliderPosition = 0f
                    }
                    mediaPlayer.setOnErrorListener { _, what, extra ->
                        Log.e("Audio", "播放错误: what=$what, extra=$extra")
                        isPlaying = false
                        true
                    }
                    Log.d("Audio", "调用prepareAsync()")
                    mediaPlayer.prepareAsync()
                } catch (e: Exception) {
                    Log.e("Audio", "MediaPlayer异常: ${e.message}", e)
                    isPlaying = false
                }
            } else {
                Log.w("Audio", "音频URL为空")
                isPlaying = false
            }
        } else {
            Log.d("Audio", "暂停播放")
            if (mediaPlayer.isPlaying) {
                mediaPlayer.pause()
            }
        }
        
        onDispose {
            Log.d("Audio", "DisposableEffect dispose")
            if (mediaPlayer.isPlaying) {
                mediaPlayer.stop()
            }
            mediaPlayer.release()
            toneGenerator.release()
        }
    }
    
    // Update slider position during playback
    LaunchedEffect(isPlaying, mediaPlayer) {
        if (isPlaying && mediaPlayer.isPlaying) {
            while (isActive && !isSliding) {
                currentPosition = mediaPlayer.currentPosition
                if (duration > 0) {
                    sliderPosition = currentPosition.toFloat() / duration.toFloat()
                }
                delay(500) // Update every 500ms
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "返回"
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
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                androidx.compose.material3.CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Podcast Header
                item {
                    PodcastHeader(podcast = podcast)
                }

                // Now Playing Card
                if (currentEpisode != null) {
                    item {
                        NowPlayingCard(
                            episode = currentEpisode!!,
                            isPlaying = isPlaying,
                            currentPosition = currentPosition,
                            duration = duration,
                            sliderPosition = sliderPosition,
                            onPlayPauseClick = { isPlaying = !isPlaying },
                            onStopClick = { 
                                currentEpisode = null; 
                                isPlaying = false; 
                                sliderPosition = 0f;
                            },
                            onSeek = { position ->
                                val newPosition = (position * duration).toInt()
                                mediaPlayer.seekTo(newPosition)
                                currentPosition = newPosition
                                // Play seek feedback sound
                                try {
                                    toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP, 100)
                                } catch (e: Exception) {
                                    Log.e("Audio", "播放提示音失败", e)
                                }
                            },
                            onSliderValueChange = { value ->
                                sliderPosition = value
                                isSliding = true
                            },
                            onSliderValueChangeFinished = {
                                isSliding = false
                                val newPosition = (sliderPosition * duration).toInt()
                                mediaPlayer.seekTo(newPosition)
                                currentPosition = newPosition
                                // Play seek feedback sound
                                try {
                                    toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP, 100)
                                } catch (e: Exception) {
                                    Log.e("Audio", "播放提示音失败", e)
                                }
                            }
                        )
                    }
                }

                // Episodes Section
                item {
                    Text(
                        text = "节目列表",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                }

                items(episodes) { episode ->
                    EpisodeCard(
                        episode = episode,
                        onClick = {
                            currentEpisode = episode
                            isPlaying = true
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun PodcastHeader(podcast: Podcast) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (!podcast.imageUrl.isNullOrBlank()) {
                AsyncImage(
                    model = podcast.imageUrl,
                    contentDescription = podcast.title,
                    modifier = Modifier
                        .size(100.dp)
                        .clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .clip(RoundedCornerShape(12.dp))
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
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = podcast.title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = podcast.author,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = podcast.description,
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun NowPlayingCard(
    episode: Episode,
    isPlaying: Boolean,
    currentPosition: Int,
    duration: Int,
    sliderPosition: Float,
    onPlayPauseClick: () -> Unit,
    onStopClick: () -> Unit,
    onSeek: (Float) -> Unit,
    onSliderValueChange: (Float) -> Unit,
    onSliderValueChangeFinished: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "正在播放",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        text = episode.title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Row {
                    FilledIconButton(
                        onClick = onPlayPauseClick,
                        colors = IconButtonDefaults.filledIconButtonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (isPlaying) "暂停" else "播放"
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    FilledIconButton(
                        onClick = onStopClick,
                        colors = IconButtonDefaults.filledIconButtonColors(
                            containerColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "停止"
                        )
                    }
                }
            }
            
            // Progress slider with seek feedback
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = formatTime(currentPosition),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                
                Slider(
                    value = sliderPosition,
                    onValueChange = onSliderValueChange,
                    onValueChangeFinished = onSliderValueChangeFinished,
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp)
                )
                
                Text(
                    text = formatTime(duration),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
    }
}

@Composable
fun EpisodeCard(
    episode: Episode,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (!episode.image.isNullOrBlank()) {
                AsyncImage(
                    model = episode.image,
                    contentDescription = episode.title,
                    modifier = Modifier
                        .size(60.dp)
                        .clip(RoundedCornerShape(8.dp)),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.secondary),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = episode.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = episode.pubDate.take(16),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (!episode.duration.isNullOrBlank()) {
                        Text(
                            text = formatDuration(episode.duration.toIntOrNull() ?: 0),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            Icon(
                imageVector = Icons.Default.PlayArrow,
                contentDescription = "播放",
                tint = MaterialTheme.colorScheme.primary
            )
        }
    }
}

private fun formatDuration(seconds: Int): String {
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    return if (hours > 0) {
        "${hours}小时${minutes}分钟"
    } else {
        "${minutes}分钟"
    }
}

// Format milliseconds to time string (mm:ss or hh:mm:ss)
private fun formatTime(millis: Int): String {
    if (millis <= 0) return "0:00"
    
    val totalSeconds = millis / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    
    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%d:%02d", minutes, seconds)
    }
}

