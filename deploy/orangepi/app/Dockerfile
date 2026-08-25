# nginx serves CI-built files from /usr/share/nginx/html (bind-mounted).
FROM nginx:1.27-alpine
COPY deploy/orangepi/app/nginx.conf /etc/nginx/conf.d/default.conf
# Placeholder so the image starts before the first sync; CI overwrites via volume.
RUN mkdir -p /usr/share/nginx/html && printf '%s\n' '<!doctype html><title>texLooper</title><p>Waiting for deploy…</p>' > /usr/share/nginx/html/index.html
EXPOSE 80
