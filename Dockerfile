# ==============================================================================
# Floci-GCP: Docker Container Specification
# ==============================================================================
# High-Performance Local Google Cloud Platform Runtime in Aura Lang
# ==============================================================================

FROM rust:1.80-slim as builder

WORKDIR /build
COPY . .

# Build Aura Compiler
RUN cargo build --release

# Stage 2: Runtime Image
FROM node:20-alpine

WORKDIR /app

# Copy aurac compiler binary and floci-gcp project
COPY --from=builder /build/target/release/aurac /usr/local/bin/aurac
COPY floci-gcp/ /app/floci-gcp/

EXPOSE 8080

ENV GCP_PORT=8080
ENV PORT=8080

HEALTHCHECK --interval=5s --timeout=2s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/_gcp/health || exit 1

ENTRYPOINT ["aurac", "run", "floci-gcp/server.aura"]
