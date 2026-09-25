# CoreIT — imagen para instalar en los servidores de la empresa.
# Uso: ver docs/ENTREGA.md

FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/write-config.sh /docker-entrypoint.d/40-coreit-config.sh
RUN chmod +x /docker-entrypoint.d/40-coreit-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
