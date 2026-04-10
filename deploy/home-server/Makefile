.PHONY: up down restart logs status update build ps pull nuke

SHELL := /usr/bin/env bash

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f --tail=200

status:
	@docker compose ps
	@echo
	@echo "--- tailscale serve/funnel ---"
	@sudo tailscale serve status 2>/dev/null || true

build:
	@echo "Building twitter-bot from ~/bot-sources/twitter…"
	docker build -t twitter-bot:latest $$HOME/bot-sources/twitter

pull:
	docker compose pull --quiet

update:
	./update.sh

ps:
	docker compose ps

nuke:
	@read -p "This will DELETE all containers AND all volume data. Type YES: " c && [ "$$c" = "YES" ]
	docker compose down -v
