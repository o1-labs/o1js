unit-tests:
	docker compose build unit-tests-local
	TESTS="/app/dist/node/lib/util/base58.unit-test.js" docker compose up unit-tests-local

test:
	docker compose build mina-local-network
	docker compose up mina-local-network
