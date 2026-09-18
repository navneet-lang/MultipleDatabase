#!/bin/sh
set -e

# ----------------------------------------------------------------------
# entrypoint.sh
# Container start hote hi ye script chalta hai:
#   1. Postgres ready hone tak wait karo
#   2. Migrations run karo
#   3. Static files collect karo (production ke liye)
#   4. Server start karo (gunicorn ya runserver, env ke hisaab se)
# ----------------------------------------------------------------------

echo ">>> Waiting for Postgres at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."

while ! nc -z "${POSTGRES_HOST:-db}" "${POSTGRES_PORT:-5432}"; do
  sleep 0.5
done

echo ">>> Postgres is up."

echo ">>> Running migrations..."
python manage.py migrate --noinput

if [ "${DJANGO_COLLECTSTATIC:-1}" = "1" ]; then
  echo ">>> Collecting static files..."
  python manage.py collectstatic --noinput
fi

if [ "${DJANGO_ENV:-development}" = "production" ]; then
  echo ">>> Starting Gunicorn (production)..."
  exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-60}"
else
  echo ">>> Starting Django dev server..."
  exec python manage.py runserver 0.0.0.0:8000
fi