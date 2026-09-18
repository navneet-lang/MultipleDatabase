FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1


WORKDIR /app

#system deps : postgres client libs(psycopg2 ke liye)+ build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

#Dependencies pehle copy karo (Docker layar caching  ka fayad  milega )
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

#ab poora project code copy karo 
COPY . . 

#entrypoint.sh ko executable banao 
COPY docker/entrypoint.sh /app/docker/entrypoint.sh
RUN chmod +x /app/docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT [ "/app/docker/entrypoint.sh" ]

