
serve:
	nodemon --watch back --exec babel-node ./back/test-app.js

test:
	mocha --compilers "js:babel/register" back/test-db.js

