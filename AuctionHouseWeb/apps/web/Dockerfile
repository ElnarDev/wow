FROM node:22-bookworm-slim
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "npm run build && exec npm run start -- --ip 0.0.0.0 --port 3000"]
