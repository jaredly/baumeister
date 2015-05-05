
MULTI='spec=- html-cov=cov.html json-cov=cov.json'
MOCHA=multi=${MULTI} ./node_modules/.bin/mocha --require babel-core/browser-polyfill --require patched-blanket -R mocha-multi

serve:
	nodemon --watch app/back --watch lib --watch extra --exec babel-node --stage 0 server.js

fill-db:
	babel-node back/test-fill-db.js

test:
	mocha -b --compilers "js:babel/register" test/*.js

test-fixtures:
	mocha -b --compilers "js:babel/register" test/fixtures.js

test-build:
	mocha --require babel-core/browser-polyfill build/test/fixtures.js

test-cov:
	${MOCHA} -b build/test/*.js

babel: b-test
	# babel app/back -d build/app/back
	# babel cli -d build/cli
	# babel *.js -d build
	# babel lib -d build/lib
	# babel extra -d build/extra
	cp extra/builders/local/runtty.py build/extra/builders/local
	mkdir -p build/test
	cp -r test/fixtures/local-git build/test/fixtures
	cp -r test/fixtures/local-project build/test/fixtures
	# babel test -d build/test

build/%.js: %.js
	babel --stage 0 $< -d build

B_TEST=$(patsubst %,build/%, $(wildcard lib/*.js) $(wildcard *.js) $(wildcard extra/*/*/*.js) $(wildcard extra/**/*.js) $(wildcard app/back/*.js) $(wildcard cli/*.js) $(wildcard test/*.js) $(wildcard test/*/*.js))

b-test: ${B_TEST}

test-manager:
	babel-node back/test-manager.js

.PHONY: test b-test
