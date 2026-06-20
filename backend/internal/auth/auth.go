package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type UserType string

const (
	UserTraveller UserType = "traveller"
	UserDriver    UserType = "driver"
	UserNTC       UserType = "ntc"
)

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Type      UserType  `json:"type"`
	Hash      string    `json:"-"`
	Salt      string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

type Store struct {
	db      *sql.DB
	hmacKey []byte
}

func NewStore(db *sql.DB) *Store {
	key := make([]byte, 32)
	rand.Read(key)
	return &Store{
		db:      db,
		hmacKey: key,
	}
}

func (s *Store) Signup(email, password, name string, userType UserType) (*User, string, error) {
	if userType != UserTraveller && userType != UserDriver {
		return nil, "", fmt.Errorf("invalid user type: %s", userType)
	}
	if email == "" || password == "" || name == "" {
		return nil, "", fmt.Errorf("email, password, and name are required")
	}
	if !strings.Contains(email, "@") {
		return nil, "", fmt.Errorf("invalid email")
	}
	if len(password) < 6 {
		return nil, "", fmt.Errorf("password must be at least 6 characters")
	}

	var exists bool
	err := s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, email).Scan(&exists)
	if err != nil {
		return nil, "", fmt.Errorf("check email: %w", err)
	}
	if exists {
		return nil, "", fmt.Errorf("email already registered")
	}

	salt := randomHex(16)
	hash := hashPassword(password, salt)
	id := "user-" + randomHex(8)
	now := time.Now()

	_, err = s.db.Exec(
		`INSERT INTO users (id, email, name, type, hash, salt, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id, email, name, string(userType), hash, salt, now,
	)
	if err != nil {
		return nil, "", fmt.Errorf("insert user: %w", err)
	}

	user := &User{
		ID:        id,
		Email:     email,
		Name:      name,
		Type:      userType,
		Hash:      hash,
		Salt:      salt,
		CreatedAt: now,
	}

	token, err := s.createToken(id, userType)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

func (s *Store) Login(email, password string) (*User, string, error) {
	user := &User{}
	err := s.db.QueryRow(
		`SELECT id, email, name, type, hash, salt, created_at FROM users WHERE email = $1`,
		email,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Type, &user.Hash, &user.Salt, &user.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, "", fmt.Errorf("invalid email or password")
	}
	if err != nil {
		return nil, "", fmt.Errorf("query user: %w", err)
	}

	if hashPassword(password, user.Salt) != user.Hash {
		return nil, "", fmt.Errorf("invalid email or password")
	}

	token, err := s.createToken(user.ID, user.Type)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

func (s *Store) ValidateToken(token string) (string, UserType, error) {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid token")
	}

	payload, err := hex.DecodeString(parts[0])
	if err != nil {
		return "", "", fmt.Errorf("invalid token")
	}

	var claims struct {
		UserID   string   `json:"uid"`
		UserType UserType `json:"typ"`
		Exp      int64    `json:"exp"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return "", "", fmt.Errorf("invalid token")
	}
	if time.Unix(claims.Exp, 0).Before(time.Now()) {
		return "", "", fmt.Errorf("token expired")
	}

	mac, err := hex.DecodeString(parts[1])
	if err != nil {
		return "", "", fmt.Errorf("invalid token")
	}
	mac2 := computeHMAC(payload, s.hmacKey)
	if !hmac.Equal(mac, mac2) {
		return "", "", fmt.Errorf("invalid token")
	}

	var userExists bool
	err = s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, claims.UserID).Scan(&userExists)
	if err != nil || !userExists {
		return "", "", fmt.Errorf("user not found")
	}

	return claims.UserID, claims.UserType, nil
}

func (s *Store) GetUser(userID string) *User {
	user := &User{}
	err := s.db.QueryRow(
		`SELECT id, email, name, type, hash, salt, created_at FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Type, &user.Hash, &user.Salt, &user.CreatedAt)
	if err != nil {
		return nil
	}
	return user
}

func (s *Store) createToken(userID string, userType UserType) (string, error) {
	claims := struct {
		UserID   string   `json:"uid"`
		UserType UserType `json:"typ"`
		Exp      int64    `json:"exp"`
	}{
		UserID:   userID,
		UserType: userType,
		Exp:      time.Now().Add(72 * time.Hour).Unix(),
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	mac := computeHMAC(payload, s.hmacKey)
	token := hex.EncodeToString(payload) + "." + hex.EncodeToString(mac)

	_, err = s.db.Exec(
		`INSERT INTO sessions (token, user_id, user_type, expires_at) VALUES ($1, $2, $3, $4)`,
		token, userID, string(userType), time.Now().Add(72*time.Hour),
	)
	if err != nil {
		return "", fmt.Errorf("insert session: %w", err)
	}

	return token, nil
}

func hashPassword(password, salt string) string {
	h := sha256.Sum256([]byte(salt + password + salt))
	return hex.EncodeToString(h[:])
}

func computeHMAC(data, key []byte) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write(data)
	return mac.Sum(nil)
}

func randomHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}
