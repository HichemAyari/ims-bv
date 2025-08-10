# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Nginx will proxy /api to backend via another container/service
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

