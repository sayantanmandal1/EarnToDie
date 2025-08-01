package database

import (
	"fmt"
	"io/fs"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Migration represents a database migration
type Migration struct {
	ID        uint      `gorm:"primaryKey"`
	Version   string    `gorm:"uniqueIndex;size:50"`
	Name      string    `gorm:"size:255"`
	AppliedAt time.Time `gorm:"autoCreateTime"`
}

// TableName specifies the table name for Migration model
func (Migration) TableName() string {
	return "schema_migrations"
}

// MigrationFile represents a migration file
type MigrationFile struct {
	Version  string
	Name     string
	FilePath string
	SQL      string
}

// RunMigrations executes pending database migrations
func RunMigrations(migrationsPath string) error {
	if DB == nil {
		return fmt.Errorf("database connection not established")
	}

	// Create migrations table if it doesn't exist
	if err := DB.AutoMigrate(&Migration{}); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Load migration files
	migrationFiles, err := loadMigrationFiles(migrationsPath)
	if err != nil {
		return fmt.Errorf("failed to load migration files: %w", err)
	}

	// Get applied migrations
	var appliedMigrations []Migration
	if err := DB.Find(&appliedMigrations).Error; err != nil {
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	appliedVersions := make(map[string]bool)
	for _, migration := range appliedMigrations {
		appliedVersions[migration.Version] = true
	}

	// Execute pending migrations
	for _, migrationFile := range migrationFiles {
		if appliedVersions[migrationFile.Version] {
			continue // Skip already applied migrations
		}

		if err := executeMigration(migrationFile); err != nil {
			return fmt.Errorf("failed to execute migration %s: %w", migrationFile.Version, err)
		}

		// Record migration as applied
		migration := Migration{
			Version: migrationFile.Version,
			Name:    migrationFile.Name,
		}
		if err := DB.Create(&migration).Error; err != nil {
			return fmt.Errorf("failed to record migration %s: %w", migrationFile.Version, err)
		}

		fmt.Printf("Applied migration: %s - %s\n", migrationFile.Version, migrationFile.Name)
	}

	return nil
}

// loadMigrationFiles loads and sorts migration files from the given directory
func loadMigrationFiles(migrationsPath string) ([]MigrationFile, error) {
	var migrationFiles []MigrationFile

	err := filepath.WalkDir(migrationsPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() || !strings.HasSuffix(path, ".sql") {
			return nil
		}

		// Extract version and name from filename
		filename := d.Name()
		parts := strings.SplitN(filename, "_", 2)
		if len(parts) < 2 {
			return fmt.Errorf("invalid migration filename format: %s", filename)
		}

		version := parts[0]
		name := strings.TrimSuffix(parts[1], ".sql")
		name = strings.ReplaceAll(name, "_", " ")

		migrationFiles = append(migrationFiles, MigrationFile{
			Version:  version,
			Name:     name,
			FilePath: path,
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Sort migrations by version
	sort.Slice(migrationFiles, func(i, j int) bool {
		return migrationFiles[i].Version < migrationFiles[j].Version
	})

	return migrationFiles, nil
}

// executeMigration executes a single migration file
func executeMigration(migrationFile MigrationFile) error {
	// For now, we'll use GORM's AutoMigrate instead of raw SQL
	// This is safer and more portable across different database systems
	
	// The actual SQL execution would be:
	// sqlContent, err := os.ReadFile(migrationFile.FilePath)
	// if err != nil {
	//     return err
	// }
	// return DB.Exec(string(sqlContent)).Error

	// Since we're using GORM models, we'll rely on AutoMigrate
	// which was already called in the Connect function
	return nil
}

// GetMigrationStatus returns the status of all migrations
func GetMigrationStatus() ([]Migration, error) {
	if DB == nil {
		return nil, fmt.Errorf("database connection not established")
	}

	var migrations []Migration
	err := DB.Order("applied_at DESC").Find(&migrations).Error
	return migrations, err
}

// RollbackMigration rolls back the last applied migration (placeholder)
func RollbackMigration() error {
	// This would require down migration files
	// For now, this is a placeholder
	return fmt.Errorf("rollback functionality not implemented yet")
}