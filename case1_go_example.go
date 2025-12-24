package main

import (
    "context"
    "crypto/rand"
    "encoding/base64"
    "errors"
    "fmt"
    "net/http"
    "strings"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
)

// User 用户模型
type User struct {
    ID       int    `json:"id"`
    Username string `json:"username"`
    Password string `json:"password"`
}

// Claims JWT Claims
type Claims struct {
    Username string `json:"username"`
    jwt.RegisteredClaims
}

// AuthService 认证服务
type AuthService struct {
    jwtSecret []byte
    users     map[string]*User
}

func NewAuthService(jwtSecret string) *AuthService {
    return &AuthService{
        jwtSecret: []byte(jwtSecret),
        users:     make(map[string]*User),
    }
}

// GenerateToken 生成JWT Token
func (s *AuthService) GenerateToken(ctx context.Context, username string) (string, error) {
    expirationTime := time.Now().Add(24 * time.Hour)
    claims := &Claims{
        Username: username,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(expirationTime),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            NotBefore: jwt.NewNumericDate(time.Now()),
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    tokenString, err := token.SignedString(s.jwtSecret)
    if err != nil {
        return "", fmt.Errorf("failed to sign token: %w", err)
    }

    return tokenString, nil
}

// ValidateToken 验证JWT Token
func (s *AuthService) ValidateToken(ctx context.Context, tokenString string) (*Claims, error) {
    claims := &Claims{}
    token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return s.jwtSecret, nil
    })

    if err != nil {
        return nil, fmt.Errorf("failed to parse token: %w", err)
    }

    if !token.Valid {
        return nil, errors.New("invalid token")
    }

    return claims, nil
}

// LoginRequest 登录请求
type LoginRequest struct {
    Username string `json:"username" binding:"required"`
    Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
    Token string `json:"token"`
}

// Login 登录处理
func (s *AuthService) Login(c *gin.Context) {
    ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
    defer cancel()

    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
        return
    }

    // 验证用户（这里简化处理，实际应该查询数据库）
    user, exists := s.users[req.Username]
    if !exists || user.Password != req.Password {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
        return
    }

    // 生成Token
    token, err := s.GenerateToken(ctx, req.Username)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
        return
    }

    c.JSON(http.StatusOK, LoginResponse{Token: token})
}

// AuthMiddleware JWT认证中间件
func (s *AuthService) AuthMiddleware() gin.HandlerFunc {
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

        claims, err := s.ValidateToken(c.Request.Context(), parts[1])
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
            c.Abort()
            return
        }

        c.Set("username", claims.Username)
        c.Next()
    }
}

func main() {
    // 生成JWT密钥（实际应该从配置读取）
    secret := make([]byte, 32)
    if _, err := rand.Read(secret); err != nil {
        panic(err)
    }
    jwtSecret := base64.URLEncoding.EncodeToString(secret)

    authService := NewAuthService(jwtSecret)

    r := gin.Default()

    // 登录接口
    r.POST("/api/login", authService.Login)

    // 受保护的路由
    protected := r.Group("/api")
    protected.Use(authService.AuthMiddleware())
    {
        protected.GET("/profile", func(c *gin.Context) {
            username, _ := c.Get("username")
            c.JSON(http.StatusOK, gin.H{"username": username})
        })
    }

    if err := r.Run(":8080"); err != nil {
        panic(err)
    }
}

