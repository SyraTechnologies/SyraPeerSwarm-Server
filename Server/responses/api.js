//a json encoded api response
module.exports = function api( code, message, data ){
	
	if(!data){
		data = null;
	}
	
	if(!code){
		code = 200;
	}
	
	if(!message){
		message = "";
	}
	
	var responseObject = {status:code,data:data,error:message};
	
	this.res.status(code).json(responseObject);
	
};