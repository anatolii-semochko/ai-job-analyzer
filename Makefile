.PHONY: build up down restart rebuild logs install dev

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose down && docker compose up -d

rebuild: build restart

logs:
	docker compose logs -f

install:
	cd client && npm install
	cd server && npm install

dev:
	cd server && npm run dev &
	cd client && npm run dev
