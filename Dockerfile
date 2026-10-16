# Stage 1: Build the frontend
FROM node:20.12.2-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend and serve the application
FROM python:3.13-slim

WORKDIR /app/backend

# Install python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Copy built frontend static files
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Run as non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Expose the API and UI port
EXPOSE 8000

# Start Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
