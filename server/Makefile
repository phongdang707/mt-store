.PHONY: rollout logs seed tls down

ROOT := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
REPO := $(abspath $(ROOT)/..)
API_PORT ?= 3000
HEALTH_URL := http://127.0.0.1:$(API_PORT)/api/health

rollout:
	git -C $(REPO) pull --ff-only origin main
	cd $(ROOT) && docker compose up -d --build --force-recreate --remove-orphans
	@i=0; \
	until body=$$(curl -fsS "$(HEALTH_URL)" 2>/dev/null) && printf '%s' "$$body" | grep -q '"mongo":"up"'; do \
	  i=$$((i+1)); \
	  if [ "$$i" -ge 30 ]; then \
	    echo "API không healthy sau 60s: $(HEALTH_URL)" >&2; \
	    cd $(ROOT) && docker compose logs --tail=80 api; \
	    exit 1; \
	  fi; \
	  sleep 2; \
	done
	@dest=/opt/nhatro/backend/deploy/nginx/mt-store.conf; \
	if [ -f "$$dest" ]; then \
	  backup=$$(mktemp); \
	  cp -a "$$dest" "$$backup"; \
	  cp -f $(ROOT)/deploy/nginx/mt-store.conf "$$dest"; \
	  if ! docker exec nhatro-nginx-1 nginx -t; then \
	    cp -a "$$backup" "$$dest"; \
	    rm -f "$$backup"; \
	    echo "nginx -t failed; previous vhost restored" >&2; \
	    exit 1; \
	  fi; \
	  rm -f "$$backup"; \
	fi; \
	docker exec nhatro-nginx-1 nginx -s reload
	@echo "https://mt-store.nhatrothongminh.click"
	@echo "https://mt-store.nhatrothongminh.click/api/health"

logs:
	cd $(ROOT) && docker compose logs -f api web

seed:
	cd $(ROOT) && docker compose run --rm api node dist/seed.js

tls:
	cd $(ROOT) && ./deploy/issue-tls.sh

down:
	cd $(ROOT) && docker compose down
