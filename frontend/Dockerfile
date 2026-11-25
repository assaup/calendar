# Сборка фронта и раздача через nginx.
# Собираем на glibc-образе (не alpine/musl): нативный бинарник сборщика
# rolldown для musl ставится ненадёжно — npm умеет пропускать платформенные
# optional-зависимости (npm/cli#4828), и сборка падает.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.31.10-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
CMD ["wget", "-q", "--spider", "http://127.0.0.1/"]
