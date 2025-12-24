package main

import (
	"errors"
	"fmt"
	"net/http"
	"time"
)

// ❌ M2 版本：不够 Go 风格的代码
// 问题：过度使用指针、缺少 context、错误处理不规范

type User struct {
	ID       *string // ❌ 过度使用指针
	Username *string
	Password *string
}

type FeedResponse struct {
	Title       *string // ❌ 过度使用指针
	Description *string
	Image       *string
	Author      *string
	Link        *string
	Items       *[]Item // ❌ 切片已经是指引用类型，不需要再指针
}

type Item struct {
	Title       *string
	Description *string
	AudioURL    *string
	PubDate     *string
	Duration    *string
	Image       *string
}

// ❌ 没有 context 超时控制
// ❌ 错误处理不够规范
func fetchFeed(url string) (*FeedResponse, error) {
	// ❌ 没有使用 context
	resp, err := http.Get(url)
	if err != nil {
		return nil, errors.New("failed to fetch feed") // ❌ 没有包装原始错误
	}

	// ❌ 没有检查 resp 是否为 nil
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("unexpected status code") // ❌ 没有返回具体状态码
	}

	// ❌ 没有解析逻辑，直接返回 nil
	return nil, nil
}

// ❌ 没有使用结构体初始化语法
func createResponse() *FeedResponse {
	title := "test"
	desc := "description"
	result := FeedResponse{
		Title:       &title, // ❌ 不必要的指针
		Description: &desc,
	}
	return &result // ❌ 不必要的指针返回
}

// ❌ 没有使用时间.Duration
func waitForResult() {
	time.Sleep(5000) // ❌ 硬编码毫秒数，应该用 time.Second * 5
}

// ❌ 错误处理太简单
func processData() error {
	data, err := getData()
	if err != nil {
		fmt.Println("error occurred")          // ❌ 没有返回错误，只是打印
		return errors.New("processing failed") // ❌ 丢失原始错误
	}
	return nil
}

func getData() error {
	return errors.New("original error")
}

func main() {
	// ❌ 复杂的 nil 检查
	var user *User
	if user != nil && user.Username != nil && *user.Username != "" {
		fmt.Println(*user.Username)
	}
}
