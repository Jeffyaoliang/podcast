package com.dreamecho.app.models

import com.google.gson.annotations.SerializedName

// Podcast data model
data class Podcast(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("title")
    val title: String,
    
    @SerializedName("description")
    val description: String,
    
    @SerializedName("image_url")
    val imageUrl: String?,
    
    @SerializedName("author")
    val author: String,
    
    @SerializedName("rss_url")
    val rssUrl: String,
    
    @SerializedName("link")
    val link: String?
)

// Episode data model
data class Episode(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("title")
    val title: String,
    
    @SerializedName("description")
    val description: String,
    
    @SerializedName("audio_url")
    val audioUrl: String?,
    
    @SerializedName("pub_date")
    val pubDate: String,
    
    @SerializedName("duration")
    val duration: String?,
    
    @SerializedName("image")
    val image: String?
)

// Feed response from API
data class FeedResponse(
    @SerializedName("title")
    val title: String,
    
    @SerializedName("description")
    val description: String,
    
    @SerializedName("image")
    val image: String?,
    
    @SerializedName("author")
    val author: String?,
    
    @SerializedName("link")
    val link: String?,
    
    @SerializedName("items")
    val items: List<Episode>
)

// User model
data class User(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("username")
    val username: String
)

// Auth response
data class AuthResponse(
    @SerializedName("token")
    val token: String,
    
    @SerializedName("user")
    val user: User
)

// Login request
data class LoginRequest(
    @SerializedName("username")
    val username: String,
    
    @SerializedName("password")
    val password: String
)

