# ==============================================================================
# Aura GCP: Docker Container Specification
# ==============================================================================
# Standalone Native / High-Performance Local Google Cloud Platform Runtime
# Repository: https://github.com/aura-lang-developer/aura-gcp
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build aurac compiler from official repository
# ------------------------------------------------------------------------------
FROM rust:slim-bookworm AS builder

WORKDIR /build

# Install git and required build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Clone aura-lang repository and build release binary for aurac
RUN git clone --depth 1 https://github.com/aura-lang-developer/aura-lang.git . && \
    mkdir -p playground && echo '<!DOCTYPE html><html><body><h1>Aura Playground</h1></body></html>' > playground/index.html && \
    cargo build --release --bin aurac -j 2

# ------------------------------------------------------------------------------
# Stage 2: Minimal Runtime Environment
# ------------------------------------------------------------------------------
FROM node:20-slim

LABEL maintainer="Aura Core Team <dev@aura-lang.org>"
LABEL org.opencontainers.image.title="Aura GCP Emulator"
LABEL org.opencontainers.image.description="Ultra-fast, native local Google Cloud runtime emulating GCP services"
LABEL org.opencontainers.image.url="https://github.com/aura-lang-developer/aura-gcp"
LABEL org.opencontainers.image.source="https://github.com/aura-lang-developer/aura-gcp"
LABEL org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app

# Install minimal runtime utilities (wget for healthcheck, ca-certificates, curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy aurac compiler binary from builder stage
COPY --from=builder /build/target/release/aurac /usr/local/bin/aurac

# Copy aura-gcp application source files
COPY . /app/

# Expose default GCP gateway port
EXPOSE 8080

# Configuration environment variables
ENV GCP_PORT=8080
ENV PORT=8080
ENV NODE_ENV=production

# Health check to ensure the server is serving traffic
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/_gcp/health || exit 1

# Start Aura GCP Local Cloud Runtime
ENTRYPOINT ["aurac", "run", "server.aura"]
