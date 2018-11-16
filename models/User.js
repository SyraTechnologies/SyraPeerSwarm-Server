var bcrypt = require('bcryptjs');

module.exports = function( app, Types ){
	
	app.model('User',{
		email: { type: String, index: { unique: true }, required: true },
		password: { type: String },
		changeName: {type: Boolean},
		displayName: { type: String, index: { unique: true }, required: true },
		avatar: { type: String, default: '/assets/anon.png' },
		permissions: {
			chat: { type: Boolean, default: true },
			admin: { type: Boolean, default: false }
		},
		online: { type: Boolean, default: true },
		channel: { type: Types.ObjectId, ref: 'Channel', default: null }, //users channel
		banned: { type: Boolean, default: false },
		banend: {type:String, default: ''},
		subs: [{ type: Types.ObjectId, ref: 'User' }],
		about: { type: String },
		temporary: {type: Boolean, default: false},
		chatid:[{_id: {type:String}}],
		created: {type: Number, default: 0}
	},function(schema){
		
		//password hashing
		schema.pre('save', function(next) {
			var user = this;

			// only hash the password if it has been modified (or is new)
			if (!user.isModified('password')) return next();

			// generate a salt
			bcrypt.genSalt(10, function(err, salt) {
				if (err){
					console.log(err);
					return next(err);
				} 

				// hash the password along with our new salt
				bcrypt.hash(user.password, salt, function(err, hash) {
					if (err) return next(err);

					// override the cleartext password with the hashed one
					user.password = hash;
					next();
				});
			});
		});
		
		//verify password on login
		schema.methods.validatePass = function(candidatePassword, cb) {
			bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
				if (err) return cb(err);
				cb(null, isMatch);
			});
		};
		
	});
	
};