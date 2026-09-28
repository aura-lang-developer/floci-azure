# ==============================================================================
# Floci-Azure: Docker Container Specification
# ==============================================================================
# High-Performance Local Microsoft Azure Runtime in Aura Lang
# ==============================================================================

FROM rust:1.80-slim as builder

WORKDIR /build
COPY . .

# Build Aura Compiler
RUN cargo build --release

# Stage 2: Runtime Image
FROM node:20-alpine

WORKDIR /app

# Copy aurac compiler binary and floci-azure project
COPY --from=builder /build/target/release/aurac /usr/local/bin/aurac
COPY floci-azure/ /app/floci-azure/

EXPOSE 10000

ENV AZURE_PORT=10000
ENV PORT=10000

HEALTHCHECK --interval=5s --timeout=2s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:10000/_azure/health || exit 1

ENTRYPOINT ["aurac", "run", "floci-azure/server.aura"]
