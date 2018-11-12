module.exports = function(app,peerserver){
	//app.use(express.bodyParser({limit: '50mb'}));
	//define all the routes here.
	app.map({
		'GET /':'Pages.index',
		'POST /speedtest':'Pages.speedtest'}
		);
	
	
};