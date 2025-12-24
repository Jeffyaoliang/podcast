// Simple favicon handler for Go backend
package main

import (
	"net/http"
	"path/filepath"
)

// Serve favicon.ico
func faviconHandler(c *gin.Context) {
	c.File("./favicon.ico")
}

// Add favicon route
// In setupRoutes:
// r.GET("/favicon.ico", faviconHandler)

