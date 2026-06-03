package handlers

import (
	"sync"
	"time"
)

type cacheEntry[T any] struct {
	data T
	exp  time.Time
}

type Cache[T any] struct {
	mu    sync.RWMutex
	ttl   time.Duration
	items map[string]cacheEntry[T]
}

func NewCache[T any](ttl time.Duration) *Cache[T] {
	return &Cache[T]{ttl: ttl, items: make(map[string]cacheEntry[T])}
}

func (c *Cache[T]) Get(key string) (T, bool) {
	c.mu.RLock()
	e, ok := c.items[key]
	c.mu.RUnlock()
	if !ok || time.Now().After(e.exp) {
		var zero T
		return zero, false
	}
	return e.data, true
}

func (c *Cache[T]) Set(key string, data T) {
	c.mu.Lock()
	c.items[key] = cacheEntry[T]{data: data, exp: time.Now().Add(c.ttl)}
	c.mu.Unlock()
}

func (c *Cache[T]) Invalidate(key string) {
	c.mu.Lock()
	delete(c.items, key)
	c.mu.Unlock()
}
