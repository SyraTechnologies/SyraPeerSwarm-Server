module.exports = {
	
	isAdmin: function(req,res,next){
		if(!req.locals.user)
			return res.redirect('/teacup');
		if(!req.locals.user.permissions.admin)
			return res.redirect('/teacup');
		//else
		next();
	},
	
	isUser: function(req,res,next){
		if(!req.locals.user)
			res.redirect('/login?notif=must_login')
		else
			next();
	},
	isGuestAccount: function(req,res,next){
		if(req.locals.user){
			if(req.locals.user.temporary){
				next();
			}else{
				res.end("Not a guest");
			}
		}else{
			res.end("Not a guest");
		}
	},
	isGuest: function(req,res,next){
		if(!req.locals.user) 
			next();
		else
			res.redirect('/?notif=already_logged_in');
	},
	isBanned: function(req,res,next){
		if(req.locals.user && req.locals.user != false){
			if(req.locals.user.banned){
				if(req.locals.user.banend != "NEVER"){
					if(parseInt(req.locals.user.banend) > Math.floor(Date.now() / 1000)){
						res.redirect('/banned');
					}else{
						req.locals.user.banned = false;
						req.locals.user.banend = "";
						req.locals.user.save();
						next();
					}
				}else{
					res.redirect('/banned');
				}
			}else{
				next();
			}
		}else{
			next();
		}
	},
	isRename: function(req,res,next){
		if(req.locals.user){
			if(req.locals.user.changeName && req.url != "/changename"){
				res.redirect('/changename');
			}else {
				if(req.url == "/changename" && !req.locals.user.changeName){
					res.redirect("/");
				}else
				next();
			}
		}else{
			next();
		}
	}
}