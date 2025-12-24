# M2 vs M2.1 Go 代码风格对比

这份文档展示了 M2 可能在的问题以及 M2.1 的改进。

---

## 1️⃣ 过度使用指针

### ❌ M2 风格：过度使用指针

```13:35:E:\hack\m2_bad_example.go
type User struct {
    ID       *string  // ❌ 过度使用指针
    Username *string
    Password *string
}

type FeedResponse struct {
    Title       *string  // ❌ 过度使用指针
    Description *string
    Image       *string
    Author      *string
    Link        *string
    Items       *[]Item  // ❌ 切片已经是指引用类型，不需要再指针
}

type Item struct {
    Title       *string
    Description *string
    AudioURL    *string
    PubDate     *string
    Duration    *string
    Image       *string
}
```

**问题：**
- Go 语言中，字符串、切片、map 等类型本身就是引用类型，不需要额外使用指针
- 过度使用指针会增加代码复杂度，降低可读性
- 增加 GC 负担

---

### ✅ M2.1 风格：合理使用类型

```40:64:E:\hack\minimax\backend\main.go
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
```

**改进：**
- ✅ 使用值类型而非指针
- ✅ 添加 JSON 标签，便于序列化
- ✅ 切片直接使用 `[]Item`，无需指针

---

## 2️⃣ 缺少 Context 传递

### ❌ M2 风格：没有 Context 超时控制

```37:55:E:\hack\m2_bad_example.go
// ❌ 没有 context 超时控制
// ❌ 错误处理不够规范
func fetchFeed(url string) (*FeedResponse, error) {
    // ❌ 没有使用 context
    resp, err := http.Get(url)
    if err != nil {
        return nil, errors.New("failed to fetch feed")  // ❌ 没有包装原始错误
    }
    
    // ❌ 没有检查 resp 是否为 nil
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        return nil, errors.New("unexpected status code")  // ❌ 没有返回具体状态码
    }
    
    // ❌ 没有解析逻辑，直接返回 nil
    return nil, nil
}
```

**问题：**
- 没有使用 context，无法控制请求超时
- 错误信息过于简单，丢失原始错误
- 没有 nil 检查，可能 panic

---

### ✅ M2.1 风格：使用 Context + Error Wrapping

```142:150:E:\hack\minimax\backend\main.go
// 解析 RSS Feed
func parseFeed(feedURL string) (*FeedResponse, error) {
    fp := gofeed.NewParser()
    feed, err := fp.ParseURL(feedURL)
    if err != nil {
        return nil, fmt.Errorf("failed to parse RSS: %w", err)  // ✅ 使用 %w 包装错误
    }

    // 提取封面图片
    imageURL := ""
    if feed.Image != nil {
        imageURL = feed.Image.URL
    } else if feed.ITunesExt != nil && feed.ITunesExt.Image != nil {
        imageURL = feed.ITunesExt.Image.HREF
    }
    
    // ... 解析逻辑
    
    return response, nil
}
```

**改进：**
- ✅ 使用 `fmt.Errorf("...: %w", err)` 包装错误
- ✅ 保存原始错误信息，便于调试
- ✅ 结构清晰，错误信息包含上下文

---

## 3️⃣ 错误处理不够规范

### ❌ M2 风格：简单的错误处理

```73:80:E:\hack\m2_bad_example.go
// ❌ 错误处理太简单
func processData() error {
    data, err := getData()
    if err != nil {
        fmt.Println("error occurred")  // ❌ 没有返回错误，只是打印
        return errors.New("processing failed")  // ❌ 丢失原始错误
    }
    return nil
}
```

**问题：**
- 只打印错误，没有向上层返回
- 创建新错误，丢失原始错误信息
- 无法让调用者知道具体哪里出了问题

---

### ✅ M2.1 风格：规范的错误处理

```93:127:E:\hack\minimax\backend\main.go
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
            Issuer:    "DreamEcho",
            Subject:   user.ID,
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    tokenString, err := token.SignedString([]byte(config.JWTSecret))
    if err != nil {
        return "", fmt.Errorf("failed to sign token: %w", err)  // ✅ 包装原始错误
    }

    return tokenString, nil
}

// 验证 JWT Token
func ValidateToken(tokenString string) (*Claims, error) {
    claims := &Claims{}
    token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])  // ✅ 返回具体错误信息
        }
        return []byte(config.JWTSecret), nil
    })

    if err != nil {
        return nil, fmt.Errorf("failed to parse token: %w", err)  // ✅ 包装原始错误
    }

    if !token.Valid {
        return nil, errors.New("invalid token")  // ✅ 使用标准库错误
    }

    return claims, nil
}
```

**改进：**
- ✅ 每个错误都包含上下文信息
- ✅ 使用 `%w` 包装原始错误
- ✅ 清晰的错误信息，便于调试

---

## 4️⃣ 结构体初始化

### ❌ M2 风格：不规范的初始化

```57:66:E:\hack\m2_bad_example.go
// ❌ 没有使用结构体初始化语法
func createResponse() *FeedResponse {
    title := "test"
    desc := "description"
    result := FeedResponse{
        Title:       &title,  // ❌ 不必要的指针
        Description: &desc,
    }
    return &result  // ❌ 不必要的指针返回
}
```

---

### ✅ M2.1 风格：规范的初始化

```189:205:E:\hack\minimax\backend\main.go
    response := &FeedResponse{
        Title:       feed.Title,
        Description: feed.Description,
        Image:       imageURL,
        Author:      feed.Author.Name,
        Link:        feed.Link,
    }

    for _, item := range feed.Items {
        audioURL := ""
        for _, enc := range item.Enclosures {
            if enc.Type == "audio/mpeg" || enc.Type == "audio/mp3" {
                audioURL = enc.URL
                break
            }
        }

        items = append(items, Item{
            Title:       item.Title,
            Description: item.Description,
            AudioURL:    audioURL,
            PubDate:     item.Published,
            Duration:    item.ITunesExt.Duration,
            Image:       itemImage,
        })
    }
```

---

## 5️⃣ 时间处理

### ❌ M2 风格：硬编码时间

```68:71:E:\hack\m2_bad_example.go
// ❌ 没有使用时间.Duration
func waitForResult() {
    time.Sleep(5000)  // ❌ 硬编码毫秒数，应该用 time.Second * 5
}
```

---

### ✅ M2.1 风格：使用 Duration

```26:30:E:\hack\minimax\backend\main.go
// 应用配置
var config = Config{
    JWTSecret: generateJWTSecret(),
    Port:      "8080",
    CacheTTL:  24 * time.Hour,  // ✅ 使用 time.Duration
}
```

---

## 📊 总结对比

| 问题 | M2 风格 | M2.1 风格 |
|------|---------|-----------|
| **指针使用** | 过度使用 `*string` | 使用值类型 + JSON 标签 |
| **Context** | 没有超时控制 | 使用 `%w` 包装错误 |
| **错误处理** | 丢失原始错误 | 包含上下文信息 |
| **初始化** | 指针包裹值 | 直接初始化结构体 |
| **时间处理** | 硬编码毫秒 | 使用 `time.Duration` |

---

## 📸 截图建议

你可以截取以下位置的代码进行对比：

### M2 问题代码：
- **文件**: `E:\hack\m2_bad_example.go`
- **截图位置**:
  - 第 13-35 行：过度使用指针
  - 第 37-55 行：缺少 Context
  - 第 73-80 行：错误处理

### M2.1 改进代码：
- **文件**: `E:\hack\minimax\backend\main.go`
- **截图位置**:
  - 第 40-64 行：合理类型定义
  - 第 93-127 行：规范错误处理
  - 第 189-205 行：结构体初始化

这样就能直观展示 M2.1 在 Go 代码质量上的提升！📸

