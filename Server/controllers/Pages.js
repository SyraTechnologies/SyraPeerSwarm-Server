function makeid() {
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz";
	for(var i = 0; i < 8; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}

module.exports = {
	index: function(req, res) {
		res.render('index', req.locals);
	},
	speedtest: function(req,res){
		res.end("DONE");
	}
};