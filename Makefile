
serve:
	nodemon --watch app/back --watch lib --watch extra --exec babel-node --stage 0 server.js

fill-db:
	babel-node back/test-fill-db.js

test:
	mocha --compilers "js:babel/register" back/test-db.js

test-manager:
	babel-node back/test-manager.js

