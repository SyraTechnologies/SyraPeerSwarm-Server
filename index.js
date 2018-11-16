require('dotenv').config({path:'./env.txt'});//load env
let log = require('log')('debug');
global.log = log;
let express = require('express');
let ex2 = express();
let fs = require('fs');
var pp = require('peer');
var PeerServer = pp.PeerServer;
var ExpressPeerServer = pp.ExpressPeerServer;




let bodyParser = require('body-parser');
let app = express();
ex2.use(function(req, res, next) {
    res.redirect('https://' + req.get('host') + '/#!test');
});
ex2.listen(80,function(){
	console.log("Listening on port 80");
});
global.app = app;
let port = 443;
let server = require('https').createServer({
	key: fs.readFileSync('ssl/privkey.pem'),
	cert: fs.readFileSync('ssl/fullchain.pem')
},app);

require('express-mongoose-helper')(app,{
    path: __dirname + '/models/',
    connectionString: 'mongodb://localhost/cam4btc',
    debug: true,
	extend: function(mongoose){
		mongoose.Promise = require('bluebird');
	}
});
 
//we wait to load controllers after all the models are ready, so we can reference them outside of the exported function without error
app.on('mongoose.models.ready',function(){
	app.use(bodyParser.json({limit: '50mb'}));
	app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
	app.use('/assets',express.static(__dirname+'/assets'));
	app.set('controllers',__dirname+'/controllers/');
	app.set('views', __dirname + '/views');
	app.set('view engine', 'twig');
	app.set('twig options', {strict_letiables: false});
		//allows us to get around origin. probably unsafe but not really important during dev.
	app.use(function(req, res, next) {
		res.header('X-Frame-Options','SAMEORIGIN');
		res.header('Access-Control-Allow-Credentials', true);
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods','GET,PUT,POST,DELETE');
		res.header('Access-Control-Allow-Headers','X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
		next();
	});
	require('./middleware')(app);
	require('express-map2')(app); // patch map() function into express
	require('./routes')(app);  // load our routes
	
	console.log('server listening on port %d',port);
	
	let options = {
    debug: true
}

var server2 = PeerServer({
  port: 2053,
  ssl: {
	key: fs.readFileSync('ssl/privkey.pem'),
	cert: fs.readFileSync('ssl/fullchain.pem')
  },
  path: "/peerjs"
});

//var peerserver = ExpressPeerServer(server, {});

//app.use('/api', peerserver);
	server.listen(port);
	let io = require('socket.io').listen(server);
	let sharedsession = require("express-socket.io-session");
	let session = app.get('session');
	io.use(sharedsession(session));
	let channels = {};
	let sockets = {};
	let sessions = {};
	io.on('connection', function(socket){
		sockets[socket.id] = socket;
		
		if (socket.handshake.session.user) {
			app.model.User.findById(socket.handshake.session.user, function(err, User) {
				if (User) {
					socket.User = User;
					socket.emit("hello", "hello " + socket.User.displayName + " " + socket.id + " is your id");
				}
			});
		}
		require("./socket-requests")(socket,channels,sockets,sessions,app);
	});
});