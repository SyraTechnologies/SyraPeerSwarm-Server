var path = require('path');

function guestid() {
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz1234567890";
	for(var i = 0; i < 6; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}
module.exports = {
	getguest: function(req, res) {
		if(!req.locals.user) {
			var user = new app.model.User({
				email: 'guest' + guestid() + '@neverexisted.com',
				password: 'norealpasswordsareallowed' + guestid(),
				displayName: 'Guest-' + guestid(),
				temporary: true,
				created: Math.floor(new Date() / 1000)
			});
			user.save(function(err, user) {
				if(err) {
					if(err.message.indexOf('displayName_1') !== -1) {
						return res.api(500, 'that display name is already taken');
					} else if(err.message.indexOf('email_1') !== -1) {
						return res.api(500, 'that email is already in use');
					} else {
						console.log(err);
						return res.api(500, 'unknown error occurred');
					}
				}
				req.session.user = user._id;
				res.end("Done");
				//console.log(user);
				//console.log()
			});
		}
	},
	getuser: function(req,res){
		return res.api(200,JSON.stringify(req.locals.user));
	},
	register: function(req,res){
		var validate = req.validate('POST',['email','password','confirm_password','displayName']);
		
		if(validate.errors.length > 0){
			return res.api(400,'missing required parameters');
		}
		
		var data = validate.data;
		
		if(data.password !== data.confirm_password){
			return res.api(400,'password mismatch');
		}
		
		var user = new app.model.User({
			email: data.email,
			password: data.password,
			displayName: data.displayName
		});
		
		user.save(function(err,user){
			
			if(err) {
				if(err.message.indexOf('displayName_1') !== -1){
					return res.api(500,'that display name is already taken');
				}
				else if(err.message.indexOf('email_1') !== -1){
					return res.api(500,'that email is already in use');
				}
				else{
					console.log(err);
					return res.api(500,'unknown error occurred');
				}
			}
				
			req.session.user = user._id;
			res.api(200,'registered successfully. you are now logged in');
			
		});
	},	registerguest: function(req,res){
		var validate = req.validate('POST',['email','password','confirm_password','displayName']);
		
		if(validate.errors.length > 0){
			return res.api(400,'missing required parameters');
		}
		
		var data = validate.data;
		
		if(data.password !== data.confirm_password){
			return res.api(400,'password mismatch');
		}
		req.locals.user.email = data.email;
		req.locals.user.displayName = data.displayName;
		req.locals.user.password = data.password;
		req.locals.user.temporary = false;
		req.locals.user.created = 0;
	//	var user = new app.model.User({
		//	email: data.email,
		//	password: data.password,
		//	displayName: data.displayName
	//	});
		
		req.locals.user.save(function(err,user){
			
			if(err) {
				if(err.message.indexOf('displayName_1') !== -1){
					return res.api(500,'that display name is already taken');
				}
				else if(err.message.indexOf('email_1') !== -1){
					return res.api(500,'that email is already in use');
				}
				else{
					console.log(err);
					return res.api(500,'unknown error occurred');
				}
			}
				
			req.session.user = user._id;
			res.api(200,'registered successfully. you are now logged in');
			
		});
	},	sethash: function(req,res){
		var validate = req.validate('POST',['hash','email']);
		
		if(validate.errors.length > 0){
			return res.api(400,'missing required parameters');
		}
		
		var data = validate.data;
		
		app.model.User.findOne({ email: data.email },function(err, user ){
			if(err || !user) return res.api(403,invalidMessage);
				user.hash = data.hash;
				user.save(function(err,user2){
					//res.api(200,'You have logged in successfully');	
				});
			
		});
	},
	
	login: function(req,res){
		
		var validate = req.validate('POST',['email','password']);
		
		if(validate.errors.length > 0){
			return res.api(400,'email and password are required');
		}
		
		var invalidMessage = 'invalid email or password';
		
		var data = validate.data;
		
		app.model.User.findOne({ email: data.email },function(err, user ){
			if(err || !user) return res.api(403,invalidMessage);
			
			user.validatePass(data.password,function(err,result){
				if(err || !result) return res.api(403,invalidMessage);
				
				//user is valid; set the session
				user.online = true;
				user.save(function(err,user2){
					req.session.user = user2._id;
					res.api(200,JSON.stringify(user));	
				});
				
			});
			
		});
		
	},
	
	logout: function(req,res){
		if(req.session && req.session.user){
			app.model.User.update({ _id: req.session.user },{ online: false },function(){
				req.session.destroy(function(){
					res.api(200,'You have logged out successfully');
				});	
			});
		}else{
			res.api(200,'You have logged out successfully');
		}
	},
	
	update: function(req,res){
		var validate = req.validate('POST',[],['about','email','password','confirm_password',"xrpaddress","displayName"]);
		
		var data = validate.data;
		
		if(data.toString() != "{}"){
			
			if(data.password){
				if(data.password !== data.confirm_password){
					return res.api(500,'password mismatch');
				}
				if(data.password == ""){
					delete data.password;
				}
			}
			
			if(data.confirm_password){
				delete data.confirm_password;
			}
					
					//console.log(req.files.avatar);
					app.model.User.findById( req.session.user ,function(err,user){
						
						if( req.files ){
							if(req.files.avatar){
								user.avatar = "data:image/raw;base64," + req.files.avatar.data.toString('base64');
							}
						}
						
						for(var prop in data){
							console.log(prop);
							if(data[prop])
							user[prop] = data[prop];
						}

						user.save(function(err,user2){

							if(err) {
								if(err.message.indexOf('displayName_1') !== -1){
									return res.api(500,'that display name is already taken');
								}
								else if(err.message.indexOf('email_1') !== -1){
									return res.api(500,'that email is already in use');
								}
								else{

									return res.api(500,'unknown error occurred');
								}
							}
							return res.api(200,'profile updated',user2.avatar);
						});
					});

					
			
		}else{
			console.log('no changes');
			return res.api(200,'profile updated');
		}
	}
	
}