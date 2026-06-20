package auth

import "context"

func withUserID(ctx context.Context, userID string, userType UserType) context.Context {
	ctx = context.WithValue(ctx, ctxKeyUserID, userID)
	ctx = context.WithValue(ctx, ctxKeyUserType, userType)
	return ctx
}
