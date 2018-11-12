var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
var store = new MongoDBStore({
	uri: 'mongodb://localhost:27017/peerswarm',
	collection: 'sessions'
});
var fs = require('fs');
var tmp = require('tmp');

store.on('error', function(error) {
	console.log(error);
});

module.exports = function(app){
	// attach global middleware here, such as body parsers and the like.
	
	//sessions
	var ses = session({
	  name: 'S_ID',
	  secret: 'a823jlsjalerjour02jflsjflaj4rl--adfjel3lwe--32',
	  resave: true,
	  saveUninitialized: true,
	  cookie: { 
		secure: false,
		maxAge: 1000 * 60 * 60 * 24 * 7
	  },
	  store: store
	});
	app.use(ses);
	app.set('session', ses);
	app.use(bodyParser.json()); // for parsing application/json
	app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
	
	app.use(fileUpload({
		limits: { 
			fileSize: 1 * 1024 * 1024,
			fields: 50,
			files: 1,
			parts: 51,
		}
	}));
	

	
	//import responses to express.response prototype
	//also add req.validateBody( schema )
	//also add req.locals
	var responses = require('./responses');
	app.use(function(req,res,next){
		for(var prop in responses){
			res[prop] = responses[prop].bind({req: req, res: res});
		}
		
		req.validate = require('./request-validator').bind({ req: req, res: res });
		
		req.locals = {};

		if(req.session && typeof req.session == 'object'){
			for(var prop in req.session){
				req.locals[prop] = req.session[prop];
			}
		}
		if(req.query.notif){
			req.locals.notif = req.query.notif;
		}
		if(!req.locals.user){
			req.locals.user = false;
			next();
		}else{
			next();
		}
	});

	
};