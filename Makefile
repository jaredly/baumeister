
MULTI='spec=- html-cov=cov.html json-cov=cov.json'
MOCHA=multi=${MULTI} ./node_modules/.bin/mocha --require babel-core/browser-polyfill --require patched-blanket -R mocha-multi

serve:
	nodemon --watch app/back --watch lib --watch extra --exec babel-node --stage 0 cli/cli.js

reset-db:
	./cli/cli.js initdb -f

test:
	mocha --compilers "js:./node_modules/babel/register" test/*.js

test-cov:
	babel-node node_modules/.bin/isparta cover --report text --report html node_modules/.bin/_mocha -- --reporter spec ./test/*.js
	cp istanbulcss/* coverage

## Old things

test-fixtures:
	mocha --compilers "js:./node_modules/babel/register" test/fixtures.js

test-build:
	mocha --require babel-core/browser-polyfill build/test/fixtures.js

old-test-cov:
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

fixtures:
	rsync -azrh test/fixtures/docker-ctx/ build/test/fixtures/docker-ctx/
	rsync -azrh test/fixtures/local-git/ build/test/fixtures/local-git/
	rsync -azrh test/fixtures/local-project/ build/test/fixtures/local-project/

.PHONY: test b-test test-cov
