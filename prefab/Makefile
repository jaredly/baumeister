
TARGS=$(patsubst Docker.%, %, $(wildcard Docker.*))

all: ${TARGS}

%: Docker.%
	docker build -t docker-ci/$@:latest -f $< .


