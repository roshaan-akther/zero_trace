package auth

import (
	"database/sql"
	"os"
	"testing"
)

func testDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}
	db, err := OpenDB(dsn)
	if err != nil {
		t.Fatalf("OpenDB: %v", err)
	}
	t.Cleanup(func() {
		db.Exec(`DELETE FROM sessions`)
		db.Exec(`DELETE FROM users`)
	})
	return db
}

func tempStore(t *testing.T) *Store {
	t.Helper()
	db := testDB(t)
	return NewStore(db)
}

func TestSignup(t *testing.T) {
	s := tempStore(t)
	user, token, err := s.Signup("alice@test.com", "password123", "Alice", UserTraveller)
	if err != nil {
		t.Fatalf("Signup failed: %v", err)
	}
	if user.Email != "alice@test.com" {
		t.Errorf("expected alice@test.com, got %s", user.Email)
	}
	if user.Type != UserTraveller {
		t.Errorf("expected traveller, got %s", user.Type)
	}
	if token == "" {
		t.Error("expected non-empty token")
	}

	uid, ut, err := s.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if uid != user.ID {
		t.Errorf("expected user ID %s, got %s", user.ID, uid)
	}
	if ut != UserTraveller {
		t.Errorf("expected traveller type, got %s", ut)
	}
}

func TestSignupDuplicateEmail(t *testing.T) {
	s := tempStore(t)
	_, _, err := s.Signup("dup@test.com", "password123", "Dup", UserTraveller)
	if err != nil {
		t.Fatalf("first signup failed: %v", err)
	}
	_, _, err = s.Signup("dup@test.com", "otherpass", "Dup2", UserDriver)
	if err == nil {
		t.Fatal("expected error for duplicate email")
	}
}

func TestSignupInvalidType(t *testing.T) {
	s := tempStore(t)
	_, _, err := s.Signup("x@test.com", "password123", "X", UserNTC)
	if err == nil {
		t.Fatal("expected error for NTC signup")
	}
}

func TestLogin(t *testing.T) {
	s := tempStore(t)
	_, _, err := s.Signup("bob@test.com", "securepass", "Bob", UserDriver)
	if err != nil {
		t.Fatalf("Signup failed: %v", err)
	}

	user, token, err := s.Login("bob@test.com", "securepass")
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if user.Name != "Bob" {
		t.Errorf("expected Bob, got %s", user.Name)
	}
	if token == "" {
		t.Error("expected non-empty token")
	}

	uid, ut, err := s.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if uid != user.ID {
		t.Errorf("expected user ID %s, got %s", user.ID, uid)
	}
	if ut != UserDriver {
		t.Errorf("expected driver type, got %s", ut)
	}
}

func TestLoginWrongPassword(t *testing.T) {
	s := tempStore(t)
	_, _, err := s.Signup("carol@test.com", "realpass", "Carol", UserTraveller)
	if err != nil {
		t.Fatalf("Signup failed: %v", err)
	}
	_, _, err = s.Login("carol@test.com", "wrongpass")
	if err == nil {
		t.Fatal("expected error for wrong password")
	}
}

func TestInvalidToken(t *testing.T) {
	s := tempStore(t)
	_, _, err := s.ValidateToken("invalidtoken")
	if err == nil {
		t.Fatal("expected error for invalid token")
	}
}

func TestGetUser(t *testing.T) {
	s := tempStore(t)
	user, _, err := s.Signup("dave@test.com", "securepass", "Dave", UserTraveller)
	if err != nil {
		t.Fatalf("Signup failed: %v", err)
	}
	got := s.GetUser(user.ID)
	if got == nil {
		t.Fatal("expected user")
	}
	if got.Email != "dave@test.com" {
		t.Errorf("expected dave@test.com, got %s", got.Email)
	}
	notFound := s.GetUser("nonexistent")
	if notFound != nil {
		t.Errorf("expected nil for nonexistent user")
	}
}
