
module.exports = function(socket,channels,sockets,sessions) {
	debug = true;
	function log(d){
		if(debug)
			console.log(d);
	}
    socket.on('disconnect', (reason) => {
        if (socket.Channel) {
			if(channels[socket.Channel].clients[socket.id])
				delete channels[socket.Channel].clients[socket.id];
			if(channels[socket.Channel].peers[socket.peerid])
				delete channels[socket.Channel].peers[socket.peerid];
            log("Cleanup done");
        }
    });
	socket.on("set peer rating",function(peer,rating){
		if(channels[socket.Channel]){
			if(channels[socket.Channel].peers[peer]){
				let temp = channels[socket.Channel].peers[peer]
				temp.Rating = rating;
				channels[socket.Channel].peers[peer] = temp;
			}
		}
	});
	socket.on("set peer max",function(peer,max){
		if(channels[socket.Channel]){
			if(channels[socket.Channel].peers[peer]){
				let temp = channels[socket.Channel].peers[peer]
				temp.Max = max;
				channels[socket.Channel].peers[peer] = temp;
			}
		}
	});
	socket.on("set peer tier",function(peer, tier){
		if(channels[socket.Channel]){
			if(channels[socket.Channel].peers[peer]){
				channels[socket.Channel].peers[peer].Tier = tier;
			}
		}
	});
	socket.on("get channel clients",function(){
		let count = 0;
		
		if(channels[socket.Channel]){
			for(var i in channels[socket.Channel].peers){
				let peer = channels[socket.Channel].peers[i];
				if(peer.Clients > 1){
					count = count + peer.Clients;
				}
			}
			socket.emit("channel clients",count);
		}
	});
	socket.on("set peer clients",function(peer,clients){
		if(channels[socket.Channel]){
			if(channels[socket.Channel].peers[peer]){
				channels[socket.Channel].peers[peer].Clients = clients;
			}
		}
	});
	socket.on("Call",function(tid,rid){
		log("Making call to " + tid + " from " + rid);
		sockets[rid] = socket;
		if(sockets[tid])
			sockets[tid].emit("Call", rid);
	});
    function EmitToChannel(channel, v1, v2) {
        Object.keys(channels[channel].clients).forEach(function(key) {
            try{
			channels[channel].clients[key].socket.emit(v1, v2);
			}catch(e){log("Failed to emit to channel ",e);}
        });
    }
    socket.on("get peer list", function() {
		if(socket.Channel)
			if(channels[socket.Channel])
				socket.emit("peer list", channels[socket.Channel].peers);
		
    });
    socket.on("add peer", function(peer) {

		sockets[peer] = socket;
		if(socket.Channel){
			if (!channels[socket.Channel]) {
				channels[socket.Channel] = {
					clients: {},
					peers: {}
				};
			}
			if(channels[socket.Channel]){
				if(!channels[socket.Channel].peers[peer]){
					socket.peerid = peer;
					channels[socket.Channel].peers[peer] = {Rating: 0, Max: 0, Tier: 0};
					socket.emit("peer list", channels[socket.Channel].peers);
				}else{
					socket.peerid = peer;
					channels[socket.Channel].peers[peer] = {Rating: 0, Max: 0, Tier: 0};
					socket.emit("peer list", channels[socket.Channel].peers);	
				}
			}
		}else{
			socket.emit("hello");
		}
    });
    socket.on("delete peer", function(peer) {
		if (channels[socket.Channel]) {
			if(channels[socket.Channel].peers[peer]){
				delete channels[socket.Channel].peers[peer];
				socket.emit("peer list", channels[socket.Channel].peers);
			}
		}
	});
    socket.on('join channel', function(channel) {
        try {
            if (!channels[channel]) {
                channels[channel] = {
                    clients: {},
                    peers: {}
                };
                channels[channel].clients[socket.id] = {
                    socket: socket,
                    user: socket.User
                };
				socket.emit("joined channel",channel);
                socket.Channel = channel;
            } else {
                channels[channel].clients[socket.id] = {
                    socket: socket,
                    user: socket.User
                };
                socket.Channel = channel;
				socket.emit("joined channel",channel);
            }

            //channels[socket.Channel].peers[socket.id] = socket.id
        } catch (e) {}
    });
};