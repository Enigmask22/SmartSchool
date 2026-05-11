package database

import (
	"log"
	"sync"

	supa "github.com/supabase-community/supabase-go"
	"smart_school_go/config"
)

var (
	client     *supa.Client
	clientOnce sync.Once
)

func GetClient() *supa.Client {
	clientOnce.Do(func() {
		cfg := config.Cfg
		if cfg.SupabaseURL == "" || cfg.SupabaseKey == "" {
			log.Fatal("SUPABASE_URL and SUPABASE_KEY must be set")
		}
		c, err := supa.NewClient(cfg.SupabaseURL, cfg.SupabaseKey, &supa.ClientOptions{})
		if err != nil {
			log.Fatalf("Failed to create Supabase client: %v", err)
		}
		client = c
		log.Println("Supabase client initialized successfully")
	})
	return client
}
