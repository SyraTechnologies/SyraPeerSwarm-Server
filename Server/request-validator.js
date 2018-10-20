// this = { req: Request, res: Response }
module.exports = function( key, required, optional ){
	
	var key = key.toLowerCase();
	
	switch(key){
		case 'get':
			var field = 'query';
		break;
		case 'params':
			var field = 'params';
		break;
		case 'post':
			var field = 'body';
		break;
		default:
			throw new Error('invalid key specified in module `request-validator`');
	}
	
	var source = this.req[ field ];
	
	var output = {},
		errors = [];
	
	if(required instanceof Array){
		for(var i=0;i<required.length;i++){
			if(source.hasOwnProperty(required[i])){
				output[required[i]] = source[required[i]];
			}else{
				errors.push(required[i]);
			}
		}	
	}
	
	if(optional instanceof Array){
		for(var i=0;i<optional.length;i++){
			if(source.hasOwnProperty(optional[i])){
				output[optional[i]] = source[optional[i]];
			}
		}	
	}
	
	return { errors: errors, data: output };

};