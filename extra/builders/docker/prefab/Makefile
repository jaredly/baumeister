
TARGS=$(patsubst Docker.%, %, $(wildcard Docker.*))

all: ${TARGS}

%: Docker.%
	docker build -t jaeger/$@:latest -f $< .


