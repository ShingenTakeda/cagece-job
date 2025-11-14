# Stage 1: Build the Go application
FROM golang:1.19-alpine AS builder

RUN apk add --no-cache build-base

WORKDIR /app

# Copy go.mod and go.sum to download dependencies first
COPY go.mod ./
# COPY go.sum ./ 
# RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the application
RUN go build -o main .

# Stage 2: Create the final image
FROM alpine:latest

WORKDIR /app

# Copy the built binary from the builder stage
COPY --from=builder /app/main .

# Expose port 8080
EXPOSE 8080

# Command to run the application
CMD ["./main"]

