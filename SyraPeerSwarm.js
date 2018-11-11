function SyraPeerSwarm() {
	
    let self = this;
    self.speedtested = false;
	self.debug = true;
    self.availabletiers = 0;
    self.remotevideoElement = "remotevideo";
    self.localvideoElement = "localvideo";
    self.mediastreamtemp = new MediaStream();
    self.log = (m) => {
        if (self.debug) console.log(m);
    };
    self.dataCons = {};
    self.currentPeerId = 0;
    self.failIds = {};
    self.tier = 0;
    self.playTries = 0;
	self.test = () => {
		self.peersocket.emit("join channel","test");
		self.peersocket.emit("add peer",self.id);
		
	};
	self.isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
				

	self.speedtest = (callback) => {
        if (!self.speedtested) {
            self.speedtested = true;
            let payload = '1';
            for (var dup = 0; dup < 20; dup++) {
                payload += payload;
            }
            let boundary = "---------------------------7da24f2e50046";
            let body = '--' + boundary + '\r\n' + 'Content-Disposition: form-data; name="file";' + 'filename="temp.txt"\r\n' + 'Content-type: plain/text\r\n\r\n' + payload + '\r\n' + '--' + boundary + '--';
            let upSpeed = 0,
                startTime = 0,
                endTime = 0;
            $.ajax({
                xhr: () => {
                    let xhr = new window.XMLHttpRequest();
                    xhr.upload.addEventListener("progress", (evt) => {
                        if (startTime == 0)
                            startTime = (new Date()).getTime();
                        if (evt.total == evt.loaded) {
                            endTime = (new Date()).getTime();
                            upSpeed = (evt.loaded) / (endTime - startTime);
                            callback(Math.ceil(upSpeed));
                        }
                    }, false);
                    return xhr;
                },
                contentType: "multipart/form-data; boundary=" + boundary,
                type: 'POST',
                url: "/speedtest",
                data: body,
                success: (data) => {}
            });
        }
    };
    self.peersocket = io('wss://localhost:443');
    self.id = function() {
        let text = "";
        let letters = "abcdefghijklmnopqrstuvwxyz";
        for (var i = 0; i < 16; i++)
            text += letters.charAt(Math.floor(Math.random() * letters.length));
        return text;
    }();
	self.resetId = () => {
		self.id = function() {
			let text = "";
			let letters = "abcdefghijklmnopqrstuvwxyz";
			for (var i = 0; i < 16; i++)
				text += letters.charAt(Math.floor(Math.random() * letters.length));
			return text;
		}();
	};
    self.options = {
        'constraints': {
            'mandatory': {
                'OfferToReceiveAudio': true,
                'OfferToReceiveVideo': true
            }
        }
    }
        
	self.InitNewPeer = (id,type) => {
    return new Peer(self.id + type, {
        secure: true,
        port: 3001,
        host: "localhost",
        path: "/peerjs",
        config: {
            'iceServers': [{
                    url: 'turn:turn.bistri.com:80',
                    credential: 'homeo',
                    username: 'homeo'
                },
                {
                    url: 'turn:numb.viagenie.ca',
                    credential: 'Testcell4506!@',
                    username: 'support@script-it.net'
                },
                {
					url: 'turn:webrtcweb.com:3478',
					username: 'muazkh',
					credential: 'muazkh'
				},
                {
                    url: 'stun:stun3.l.google.com:19302'
                },
                {
                    url: 'stun:stun4.l.google.com:19302'
                }
            ]
        }
    });
	};
	self.peervideo = self.InitNewPeer(self.id,"video");

    self.GetRandomNumber = (upto, not) => {
        let raw = Math.random();
        let number = Math.floor(raw * upto);
        if (number > not) {
            return number;
        } else {
            if (number > 3)
                return number - 1;
            else
                return number + 1;
        }
    };

    self.isblocked = (peer) => {
        for (var i in self.failIds) {
            if (i == peer && self.failIds[i] >= 2) {
				self.failIds[i] = 1;
                return true;
            }
        }
        return false;
    };
    self.BindPeer = () => {
        self.peervideo.on('error', (err) => {
            self.log("Peer video error", JSON.stringify(err));
			if (err.type == "network"){
				setTimeout(() => {
				self.peervideo.reconnect();
				},1000);
			}
			if (err.type == "peer-unavailable") {
                self.RetryConnection(true);
            }
        });
        self.peervideo.on('call', (call) => { //Received call from broadcaster
            if (!self.isbroadcaster) {
                self.peercallvideoreceive = call;

                self.log("Answering Call");
                //Answer the call from broadcaster
                call.answer(null, self.options);
                //On receive stream
                call.on('stream', (stream) => {
                    self.video.srcObject = stream;
                    self.video.play();
                    self.recordStreamVideo = stream;
                    self.peersocket.emit("add peer", self.id);
                    self.speedtest((rating) => {
                        self.peersocket.emit("set peer rating", self.id, rating);
                        let max = Math.floor(rating / 500);
                        self.peersocket.emit("set peer tier", self.id, self.tier);
                        self.peersocket.emit("set peer max", self.id, max);
                    });
                    self.isrelaying = true;
                });
            }
        });

    };
    self.BindPeer();
    self.findStat = (m, type) => [...m.values()].find(s => s.type == type && !s.isRemote);
    self.LastSnapshot = 0;
	self.AutoReconnect = () => {
		if((new Date()).getTime()/1000 - self.LastSnapshot > 60 && self.isbroadcaster){
			self.LastSnapshot = (new Date()).getTime()/1000;
			var video = $('#localvideo').get(0);
			var scale = 0.5;
			var canvas = document.createElement("canvas");
			canvas.width = video.videoWidth * scale;
			canvas.height = video.videoHeight * scale;
			canvas.getContext('2d')
				.drawImage(video, 0, 0, canvas.width, canvas.height);
			$.post("/setthumbnail", {
				img: canvas.toDataURL() //Takes the snapshot and uploads it as a base64 dataurl
			}, function(data) {

			});
		}
        if (window.ClearIntervals) {
            try {
                clearInterval(self.ARI);
            } catch (e) {
                console.log(e);
            }
            window.IntervalExists = false;
            window.ClearIntervals = false;
        }
		for(var i in self.peervideo.connections){ let peer = self.peervideo.connections[i]; for(var i2 in peer){ let con = peer[i2]; if(!con.pc){self.peervideo.connections[i].splice(i2,1);}}}
		let viewers = 0;
		for(var i in self.peervideo.connections){
			let peer = self.peervideo.connections[i];
			for(var i2 in peer){
				viewers = viewers + 1;
			}
		}
		
		if(!self.connected && !self.isbroadcaster)
			self.peersocket.emit("get peer list");
        if (self.peervideo)
            self.peersocket.emit("set peer clients", self.id, viewers);
        self.peersocket.emit("get channel clients");
			self.peersocket.emit("add peer", self.id);
		
		if (self.isbroadcaster) {
            self.speedtest((rating) => {
                self.tier = 0;
				self.rating = rating;
                self.peersocket.emit("set peer rating", self.id, rating);
                self.max = Math.floor(rating / 500);
                self.peersocket.emit("set peer tier", self.id, 0);
                self.peersocket.emit("set peer max", self.id, self.max);
            });
        }
        if (!self.isbroadcaster) {
            if (self.peercallvideoreceive) {
                if (!self.peercallvideoreceive.pc) {
                    //If there is no connection then reconnect.
					console.log(self.isChrome);
					if(self.isChrome)
						self.RetryConnection(true);
                } else {
                    //If connection exists then check the icestate to see if connected still
                    switch (self.peercallvideoreceive.pc.iceConnectionState) {
                        case 'disconnected':
							console.log(1);
							self.RetryConnection(true);
                            break;
                        case 'failed':
							console.log(2);
                            self.RetryConnection(true);
                            break;
                    }
                }
            }

        }
    };
    self.RetryConnection = (setconnected) => {
		self.peersocket.emit("delete peer",self.id);
		console.log("Connection retry called");
		for(var i in self.peervideo.connections){
			let peer = self.peervideo.connections[i];
			for(var i2 in peer){
				let con = peer[i2];
				if(con.pc){
				con.pc.close();
				con.pc = null;
				}
				if(con.peerConnection){
					con.peerConnection.close();
					delete con.peerConnection;
				}
			}
		}

        if (self.currentPeerId != 0) {
            if (!self.failIds[self.currentPeerId])
                self.failIds[self.currentPeerId] = 1;
            self.failIds[self.currentPeerId] = self.failIds[self.currentPeerId] + 1;
        }
		self.connected = false;
        self.recordStreamAudio = null;
        self.recordStreamVideo = null;

        self.log("Reconnecting to stream");
		//if(!self.connected)
		self.peersocket.emit("get peer list");
    };
    self.peersocket.on("hello", (m) => {
        
		if (self.channelId)
            self.peersocket.emit("join channel", self.channelId);
		if(self.rating)
			self.peersocket.emit("set peer rating", self.id, self.rating);
		if(self.tier)
			self.peersocket.emit("set peer tier", self.id, 0);
		if(self.max)
			self.peersocket.emit("set peer max", self.id, self.max);
	});
	
	self.determineDepth = (amt,depth) => {
		let a = amt/3;
		if(a > 1) {
			depth = depth + 1;
			return self.determineDepth(a,depth);
		}else{
			return depth;
		}
	};
    self.peersocket.on("channel clients", (m) => {
        self.availabletiers = self.determineDepth(parseFloat(m),0);
        self.log(m + " clients");
        //self.log(self.determineDepth(3000,0) + " tiers available");
    });
    self.peersocket.on("peer list", (peers) => {
        self.log(peers);
        let length = Object.keys(peers).length;
        if (length > 0) {
            let i = 0;
            let num = self.GetRandomNumber(length, 1);
            let highest = null;
            let highestR = 0;

            for (var p in peers) {
                let Clients = peers[p].Clients ? peers[p].Clients : 0;
                let Max = peers[p].Max;
                if (peers[p].Rating > highestR && Clients < Max && p != self.id && peers[p].Tier <= self.availabletiers) { //Grab the highest rating connection with less than four connections.
                    if(p != self.currentPeerId){
						highestR = peers[p].Rating;
						highest = p;
						self.tier = peers[p].Tier + 1;
						self.log(highest + " has highest rating at " + highestR);
					}
                    
                }
                i = i + 1;
                if (num == i && p != self.id && p != null && !self.isblocked(p)) {
                    if (!self.connected && !self.isbroadcaster && !highest) {
                        highest = p;
                        highestR = peers[p].Rating;
                        self.tier = peers[p].Tier + 1;
                        self.log("defaulting to random peer " + highest);
                    }
                }
            }
            if (highest && !self.connected && !self.isbroadcaster) {
                try {
                    $("#tierlabel").html("You are connected to a level " + self.tier + " tier");
                } catch (e) {
                    console.log(e);
                }
                self.currentPeerId = highest;
                self.log("Connecting to " + highest);
				//self.peersocket.emit("delete peer", highest);
                self.ConnectToPeer(highest);
            }
        }
    });
    //Received call request from viewer
    self.peersocket.on("Call", (pr) => {
		if (self.recordStreamVideo)
            self.peercallvideo = self.peervideo.call(pr + "video", self.recordStreamVideo);
    });
    self.ConnectToPeer = (pr) => {
        if (!self.connected) {
            self.log("Unavailable");
            self.connected = true;
            self.mediastreamtemp = new MediaStream();
            self.peersocket.emit("Call", pr, self.id);
        }
    };
	self.firstSuspend = false;
    self.WatchBroadcast = (rid) => {
		self.suspends = 0;
        self.video = document.getElementById(self.remotevideoElement);
		self.video.addEventListener("suspend", () => {
			if(!self.isChrome){
				if(self.firstSuspend){
					console.log(self.suspends);
					self.suspends = self.suspends + 1;
					if(self.suspends == 1)
					self.RetryConnection(true);
					self.firstSuspend = false;
				}else{
					self.firstSuspend = true;
				}
			}else{
				self.RetryConnection(true);
			}
		});
		let hasDropped = new Promise(resolve => {
			self.icfd = true;
			let lastPackets = countdown = 0,
				timeout = 3; // seconds
			let lastTime = 0;
			let iv = setInterval(() => {
				if(lastTime == self.video.currentTime && self.video.currentTime > 0){
					if(self.onVideoDrop)
						self.onVideoDrop();
					self.log("Video was paused too long. Reconnecting");
					self.RetryConnection(true);
				}
				lastTime = self.video.currentTime;
			}, 4000);
		});

		hasDropped.then(() => {
			self.log("Video was paused too long. Reconnecting");
			self.RetryConnection(true);
		}).catch((e) => {
			console.log(e);
		});
        self.channelId = rid;
        self.peersocket.emit("join channel", rid);
        if (!self.ARI) {
            window.IntervalExists = true;
            self.ARI = setInterval(self.AutoReconnect, 2000);
        }
    };
    self.StartBroadcast = (rid) => {
        $.get("/setliveid/" + rid, () => {});
        self.video = document.getElementById(self.localvideoElement);
        self.channelId = rid;
        self.peersocket.emit("join channel", rid);
        if (!self.ARI) {
            window.IntervalExists = true;
            self.ARI = setInterval(self.AutoReconnect, 2000);
        }
        navigator.mediaDevices.getUserMedia({
            video: true, audio:true
        }).then((st1) => {
			self.connected = true;
            self.video.srcObject = st1;
			self.video.muted = true;
            self.video.play();
            self.recordStreamVideo = st1;
			self.isbroadcaster = true;
        });
    };
    return self;
}