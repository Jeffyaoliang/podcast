package main

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/mmcdole/gofeed"
)

// 配置
type Config struct {
	JWTSecret string
	Port      string
	CacheTTL  time.Duration
}

// 应用配置
var config = Config{
	JWTSecret: generateJWTSecret(),
	Port:      "8080",
	CacheTTL:  24 * time.Hour,
}

// JWT Claims
type Claims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// 用户模型
type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"`
}

// RSS Feed 响应
type FeedResponse struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
	Author      string `json:"author"`
	Link        string `json:"link"`
	Items       []Item `json:"items"`
}

// 单集项
type Item struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	AudioURL    string `json:"audio_url"`
	PubDate     string `json:"pub_date"`
	Duration    string `json:"duration"`
	Image       string `json:"image"`
}

// 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// 登录响应
type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// 缓存结构
type FeedCache struct {
	Data      *FeedResponse
	Timestamp time.Time
}

var feedCache = make(map[string]*FeedCache)

// 生成 JWT 密钥
func generateJWTSecret() string {
	secret := make([]byte, 32)
	rand.Read(secret)
	return base64.URLEncoding.EncodeToString(secret)
}

// 创建 JWT Token
func CreateToken(user User) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// 验证 JWT Token
func ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(config.JWTSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// 解析 RSS Feed
func ParseRSS(feedURL string) (*FeedResponse, error) {
	// 检查缓存
	if cached, ok := feedCache[feedURL]; ok {
		if time.Since(cached.Timestamp) < config.CacheTTL {
			return cached.Data, nil
		}
	}

	fp := gofeed.NewParser()
	feed, err := fp.ParseURL(feedURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse RSS: %w", err)
	}

	// 获取图片
	image := ""
	if feed.Image != nil {
		image = feed.Image.URL
	}

	// 转换 Items
	items := make([]Item, 0, len(feed.Items))
	for _, item := range feed.Items {
		audioURL := ""
		if len(item.Enclosures) > 0 {
			audioURL = item.Enclosures[0].URL
		}

		// 获取 iTunes 数据
		itemImage := image
		duration := ""
		
		// 使用 iTunesItemExtension
		if item.ITunesExt != nil {
			if item.ITunesExt.Image != "" {
				itemImage = item.ITunesExt.Image
			}
			if item.ITunesExt.Duration != "" {
				duration = item.ITunesExt.Duration
			}
		}

		items = append(items, Item{
			Title:       item.Title,
			Description: item.Description,
			AudioURL:    audioURL,
			PubDate:     item.Published,
			Duration:    duration,
			Image:       itemImage,
		})
	}

	response := &FeedResponse{
		Title:       feed.Title,
		Description: feed.Description,
		Image:       image,
		Author:      feed.Author.Name,
		Link:        feed.Link,
		Items:       items,
	}

	// 更新缓存
	feedCache[feedURL] = &FeedCache{
		Data:      response,
		Timestamp: time.Now(),
	}

	return response, nil
}

// JWT 中间件
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			c.Abort()
			return
		}

		claims, err := ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Next()
	}
}

// 路由处理函数
func setupRoutes(r *gin.Engine) {
	// 健康检查
	r.GET("/api/health", healthHandler)

	// 公开路由
	r.POST("/api/login", loginHandler)
	r.GET("/api/feed", feedHandler)
	r.GET("/api/feed/:url", feedHandlerByParam)
	
	// 音频代理（解决跨域问题）
	r.GET("/api/proxy/audio", audioProxyHandler)

	// 受保护路由
	protected := r.Group("/api")
	protected.Use(AuthMiddleware())
	{
		protected.GET("/profile", profileHandler)
		protected.GET("/subscriptions", subscriptionsHandler)
		protected.POST("/subscriptions", addSubscriptionHandler)
		protected.DELETE("/subscriptions/:url", removeSubscriptionHandler)
	}
}

// 健康检查处理
func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"service":   "DreamEcho Backend",
		"timestamp": time.Now().Format(time.RFC3339),
		"version":   "1.0.0",
	})
}

// 音频代理处理
func audioProxyHandler(c *gin.Context) {
	audioURL := c.Query("url")
	
	if audioURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url parameter required"})
		return
	}

	// 设置响应头，允许跨域
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
	c.Header("Access-Control-Expose-Headers", "Content-Length, Content-Type")
	c.Header("Access-Control-Allow-Headers", "Range")

	// 转发请求到音频源
	resp, err := http.Get(audioURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to fetch audio: %v", err)})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("audio server returned status %d", resp.StatusCode)})
		return
	}

	// 获取内容类型
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "audio/mpeg"
	}
	c.Header("Content-Type", contentType)

	// 获取内容长度
	contentLength := resp.Header.Get("Content-Length")
	if contentLength != "" {
		c.Header("Content-Length", contentLength)
	}

	// 设置缓存控制（1小时）
	c.Header("Cache-Control", "public, max-age=3600")

	// 读取音频数据
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to read audio: %v", err)})
		return
	}

	// 直接返回音频数据
	c.Data(http.StatusOK, contentType, body)
}

// 登录处理
func loginHandler(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// 简化处理：用户名密码相同即可登录
	user := User{
		ID:       generateUserID(),
		Username: req.Username,
		Password: req.Password,
	}

	token, err := CreateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		Token: token,
		User:  user,
	})
}

// Feed 处理（查询参数）
func feedHandler(c *gin.Context) {
	feedURL := c.Query("url")
	
	if feedURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url 参数不能为空"})
		return
	}

	// 验证是否为有效 URL
	if !strings.HasPrefix(feedURL, "http://") && !strings.HasPrefix(feedURL, "https://") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 URL 格式，请输入完整的 RSS 地址"})
		return
	}

	feed, err := ParseRSS(feedURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("解析失败: %v", err)})
		return
	}

	c.JSON(http.StatusOK, feed)
}

// Feed 处理（路径参数）
func feedHandlerByParam(c *gin.Context) {
	feedURL := c.Param("url")
	
	if feedURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url parameter required"})
		return
	}

	feed, err := ParseRSS(feedURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, feed)
}

// Profile 处理
func profileHandler(c *gin.Context) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")

	c.JSON(http.StatusOK, gin.H{
		"user_id":  userID,
		"username": username,
	})
}

// 模拟订阅数据
var subscriptions = make(map[string]bool)

// 获取订阅列表
func subscriptionsHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"subscriptions": subscriptions,
	})
}

// 添加订阅
func addSubscriptionHandler(c *gin.Context) {
	var req struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	subscriptions[req.URL] = true
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// 移除订阅
func removeSubscriptionHandler(c *gin.Context) {
	url := c.Param("url")
	delete(subscriptions, url)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func generateUserID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// CORS 中间件
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	setupRoutes(r)
	
	// 处理 favicon.ico 请求
	r.GET("/favicon.ico", func(c *gin.Context) {
		c.String(http.StatusNoContent, "")
	})
	
	// 处理 apple-touch-icon 请求
	r.GET("/apple-touch-icon.png", func(c *gin.Context) {
		c.String(http.StatusNoContent, "")
	})

	addr := fmt.Sprintf(":%s", config.Port)
	fmt.Printf("DreamEcho Backend server running on http://localhost%s\n", addr)
	fmt.Printf("API Endpoints:\n")
	fmt.Printf("  - POST /api/login\n")
	fmt.Printf("  - GET  /api/feed?url=<RSS_URL>\n")
	fmt.Printf("  - GET  /api/profile\n")
	fmt.Printf("  - GET  /api/subscriptions\n")
	if err := r.Run(addr); err != nil {
		panic(err)
	}
}
