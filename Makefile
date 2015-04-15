
serve:
	nodemon --watch back --exec babel-node ./back/test-app.js

fill-db:
	babel-node back/test-fill-db.js

test:
	mocha --compilers "js:babel/register" back/test-db.js

test-manager:
	babel-node back/test-manager.js

