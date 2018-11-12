require('dotenv').config({path:'./env.txt'});//load env
var log = require('log')('debug');
global.log = log;
var express = require('express');
var ex2 = express();
var fs = require('fs');
var pp = require('peer');
var PeerServer = pp.PeerServer;
var ExpressPeerServer = pp.ExpressPeerServer;
var bodyParser = require('body-parser');
var app = express();
ex2.use(function(req, res, next) {
    res.redirect('https://' + req.get('host') + '/#!test');
});
ex2.listen(80,function(){
	console.log("Listening on port 80");
});
global.app = app;
var port = 443;
var server = require('https').createServer({
	key: fs.readFileSync('ssl/privkey.pem'),
	cert: fs.readFileSync('ssl/fullchain.pem')
},app);

//we wait to load controllers after all the models are ready, so we can reference them outside of the exported function without error
	app.use('/assets',express.static(__dirname+'/assets'));
	app.set('controllers',__dirname+'/controllers/');
	app.set('views', __dirname + '/views');
	app.set('view engine', 'twig');
	app.set('twig options', {strict_variables: false});
		//allows us to get around origin. probably unsafe but not really important during dev.
	app.use(function(req, res, next) {
		res.header('X-Frame-Options','SAMEORIGIN');
		res.header('Access-Control-Allow-Credentials', true);
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods','GET,PUT,POST,DEvarE');
		res.header('Access-Control-Allow-Headers','X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
		next();
	});
	require('./middleware')(app);
	require('express-map2')(app); // patch map() function into express
	require('./routes')(app);  // load our routes

	var peerserver = PeerServer({
	  port: 3001,
	  ssl: {
		key: fs.readFileSync('ssl/privkey.pem'),
		cert: fs.readFileSync('ssl/fullchain.pem')
	  },
	  path: "/peerjs"
	});
	server.listen(port);
	var io = require('socket.io').listen(server);
	var sharedsession = require("express-socket.io-session");
	var session = app.get('session');
	io.use(sharedsession(session));
	var channels = {};
	var sockets = {};

	io.on('connection', function(socket){
		require("./socket-requests")(socket,channels,sockets,app);
		console.log('User Connected');
	});