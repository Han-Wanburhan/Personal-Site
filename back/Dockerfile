# ---- Stage 1: build ----
# Full Go toolchain, only used to compile. Not shipped.
FROM golang:1.26-alpine AS build
WORKDIR /src

# Download modules first: this layer is cached until go.mod/go.sum change,
# so code-only changes rebuild in seconds.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# CGO_ENABLED=0  -> fully static binary, runs without libc
# -tags timetzdata -> embed the time zone database (DSN uses loc=Asia/Bangkok)
# -trimpath -ldflags "-s -w" -> smaller binary, no local paths inside
RUN CGO_ENABLED=0 GOOS=linux go build -tags timetzdata -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

# ---- Stage 2: run ----
# distroless/static: no shell, no package manager, runs as non-root.
# Smaller and much less for an attacker to use.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/api"]
