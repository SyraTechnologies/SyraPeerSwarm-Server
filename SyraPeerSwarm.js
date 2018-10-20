function SyraPeerSwarm(){
	let SPS = this;
	this.speedtested = false;
	this.speedtest = (callback) => {
		if(!this.speedtested){
			this.speedtested = true;
			let payload = '1';
			for (var dup = 0; dup < 20; dup++){
				payload += payload;
			}
			let boundary = "---------------------------7da24f2e50046";
			let body = '--' + boundary + '\r\n'+ 'Content-Disposition: form-data; name="file";'+ 'filename="temp.txt"\r\n'+ 'Content-type: plain/text\r\n\r\n'+ payload + '\r\n'+ '--' + boundary + '--';
			let upSpeed = 0 , startTime = 0, endTime = 0;
			$.ajax({
				xhr: () => {
						let xhr = new window.XMLHttpRequest();
						xhr.upload.addEventListener("progress", (evt) => {
							if(startTime == 0)
								startTime = (new Date()).getTime();
							if(evt.total == evt.loaded){
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
				success: (data) => {
				}
			});
		}
	};
	this.peersocket = io('wss://localhost:443');
	this.id = function(){
		let text = "";
		let letters = "abcdefghijklmnopqrstuvwxyz";
		for (var i = 0; i < 16; i++)
			text += letters.charAt(Math.floor(Math.random() * letters.length));
		return text;
	}();
	this.options = {
		'constraints': {
			'mandatory': {
				'OfferToReceiveAudio': true,
				'OfferToReceiveVideo': true
			}
		}
	}
	this.video = null;
	this.debug = true;
	this.peercallaudio = null;
	this.availabletiers = 0;
	this.remotevideoElement = "remotevideo";
	this.localvideoElement = "localvideo";
	this.peercallvideo = null;
	this.mediastreamtemp = new MediaStream();
	this.log = (m) => { if(this.debug) console.log(m);};
	this.dataCons = {};
	this.currentPeerId = 0;
	this.failIds = {};
	this.tier = 0;
	this.playTries = 0;
	this.peeraudio = new Peer(this.id + "audio", { secure: true,port: 3001,host: "localhost",path: "/peerjs",
		config: {
			'iceServers': [
				{url: 'turn:turn.bistri.com:80', credential: 'homeo' ,username:'homeo'},
				{url: 'turn:numb.viagenie.ca',credential: 'Testcell4506!@',username: 'support@script-it.net'},
				{url: 'stun:stun2.l.google.com:19302'},
				{url: 'stun:stun3.l.google.com:19302'},
				{url: 'stun:stun4.l.google.com:19302'}
		]}});
	this.peervideo = new Peer(this.id + "video", { secure: true,port: 3001,host: "localhost",path: "/peerjs",
		config: {
			'iceServers': [
				{url: 'turn:turn.bistri.com:80', credential: 'homeo' ,username:'homeo'},
				{url: 'turn:numb.viagenie.ca',credential: 'Testcell4506!@',username: 'support@script-it.net'},
				{url: 'stun:stun2.l.google.com:19302'},
				{url: 'stun:stun3.l.google.com:19302'},
				{url: 'stun:stun4.l.google.com:19302'}
		]}});


	this.GetRandomNumber = (upto, not) => {
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

	this.isblocked = (peer) => {
		for (var i in this.failIds) {
			if (i == peer && this.failIds[i] > 3) {
				return true;
			}
		}
		return false;
	};

	this.BindPeer = () => {

		this.peeraudio.on('error', (err) => {
			SPS.log("Peer audio error",JSON.stringify(err));
			if (err.type == "peer-unavailable") {
				SPS.connected = false;
				if(!SPS.failIds[SPS.currentPeerId])
					SPS.failIds[SPS.currentPeerId] = 1;
				SPS.failIds[SPS.currentPeerId] = SPS.failIds[SPS.currentPeerId] + 1;
				SPS.RetryConnection(true);
			}
		});
		//Received call from the broadcaster
		this.peeraudio.on('call', (call) => { 
			if (!SPS.isbroadcaster) {
				SPS.peercallaudio = call;
				//Answer the call from broadcaster
				call.answer(null, SPS.options);
				//On receive stream
				call.on('stream', (stream) => {
					stream.getAudioTracks().forEach(track => SPS.mediastreamtemp.addTrack(track)); //Merge video and audio tracks into mediastreamtemp
					stream.oninactive = () => { SPS.connected = false; };
					//Set video source and play stream.
					SPS.video.srcObject = SPS.mediastreamtemp;
					SPS.video.play();
					SPS.recordStreamAudio = stream;
					SPS.peersocket.emit("add peer", SPS.id);
					SPS.speedtest((rating) => {
						SPS.peersocket.emit("set peer rating",SPS.id,rating);
						let max = Math.floor(rating/500);
						SPS.peersocket.emit("set peer tier",SPS.id,SPS.tier);
						SPS.peersocket.emit("set peer max",SPS.id,max);
					});
					SPS.isrelaying = true;
				});
			}
		});
		this.peervideo.on('error', (err) => {
			SPS.log("Peer video error",JSON.stringify(err));
			if (err.type == "peer-unavailable") {
				SPS.connected = false;
				if(!SPS.failIds[SPS.currentPeerId])
					SPS.failIds[SPS.currentPeerId] = 1;
				SPS.failIds[SPS.currentPeerId] = SPS.failIds[SPS.currentPeerId] + 1;
				SPS.RetryConnection(true);
			}
		});
		this.peervideo.on('call', (call) => { //Received call from broadcaster
			if (!this.isbroadcaster) {
				SPS.peercallvideo = call;
				SPS.log("Answering Call");
				SPS.peercallaudio = call;
				//Answer the call from broadcaster
				call.answer(null, SPS.options);
				//On receive stream
				call.on('stream',(stream) => {
					stream.getVideoTracks().forEach(track => SPS.mediastreamtemp.addTrack(track)); //Merge video and audio tracks into mediastreamtemp
					stream.oninactive = () => { SPS.connected = false; };
					//Set video source and play stream.
					SPS.video.srcObject = SPS.mediastreamtemp;
					SPS.video.play();
					SPS.recordStreamVideo = stream;
					SPS.peersocket.emit("add peer", SPS.id);
					SPS.speedtest((rating) => {
						SPS.peersocket.emit("set peer rating",SPS.id,rating);
						let max = Math.floor(rating/500);
						SPS.peersocket.emit("set peer tier",SPS.id,SPS.tier);
						SPS.peersocket.emit("set peer max",SPS.id,max);
					});
					SPS.isrelaying = true;
				});
			}
		});

	};
	this.BindPeer();
	this.AutoReconnect = () => {
		if(window.ClearIntervals){
			console.log("Clearing interval");
			try{clearInterval(SPS.ARI);}catch(e){console.log(e);}
			window.IntervalExists = false;
			window.ClearIntervals = false;
		}
		if(SPS.peervideo)
				SPS.peersocket.emit("set peer clients",SPS.id,Object.keys(SPS.peervideo.connections).length - 1);
		SPS.peersocket.emit("get channel clients");
		if (SPS.isbroadcaster) {
			SPS.peersocket.emit("add peer", SPS.id);
			SPS.speedtest((rating) => {
				SPS.tier = 0;
				SPS.peersocket.emit("set peer rating",SPS.id,rating);
				let max = Math.floor(rating/500);
				
				SPS.peersocket.emit("set peer tier",SPS.id,0);
				SPS.peersocket.emit("set peer max",SPS.id,max);
			});
		} else {
			SPS.peersocket.emit("get peer list"); 
		}
		if (!SPS.isbroadcaster) {
			if (SPS.peercallvideo) {
				if (!SPS.peercallvideo.pc) {
					//If there is no connection then reconnect.
					if(!SPS.failIds[SPS.currentPeerId])
						SPS.failIds[SPS.currentPeerId] = 1;
					SPS.failIds[SPS.currentPeerId] = SPS.failIds[SPS.currentPeerId] + 1;
					SPS.RetryConnection(true); 
					SPS.log("No call exists");
				} else {
					//If connection exists then check the icestate to see if connected still
					SPS.log("Ice connection state " + SPS.peercallvideo.pc.iceConnectionState);
					switch (SPS.peercallvideo.pc.iceConnectionState) {
						case 'disconnected':
							if(!SPS.failIds[SPS.currentPeerId])
								SPS.failIds[SPS.currentPeerId] = 1;
							SPS.failIds[SPS.currentPeerId] = SPS.failIds[SPS.currentPeerId] + 1;
							SPS.RetryConnection(true);
							break;
						case 'failed':
							if(!SPS.failIds[SPS.currentPeerId])
								SPS.failIds[SPS.currentPeerId] = 1;
							SPS.failIds[SPS.currentPeerId] = SPS.failIds[SPS.currentPeerId] + 1;
							SPS.RetryConnection(true);
							break;
					}
				}
			} else {
				if(!SPS.failIds[SPS.currentPeerId])
					SPS.failIds[SPS.currentPeerId] = 1;
				SPS.failIds[SPS.currentPeerId] = SPS.failIds[SPS.currentPeerId] + 1;
				SPS.RetryConnection(true);
			}
		}
	};
	this.RetryConnection = (setconnected) => {
		if (setconnected) {
			this.connected = false;
		}
		if(this.recordStreamAudio)
			this.recordStreamAudio = null;
		if(this.recordStreamVideo)
			this.recordStreamVideo = null;
		this.log("Reconnecting to stream");
		this.peersocket.emit("get peer list");
	};
	this.peersocket.on("best peer", (m) => {
		SPS.log(m);
	});
	this.peersocket.on("done", (m) => {
		SPS.log(m);
	});
	this.peersocket.on("hello", (m) => {
		if(SPS.channelId)
			SPS.peersocket.emit("join channel",SPS.channelId);
	});
	this.peersocket.on("channel clients", (m) => {
		SPS.availabletiers = Math.ceil(parseFloat(m)/4);
		SPS.log(m + " clients");
	});
	this.peersocket.on("peer list", (peers) => {
		let length = Object.keys(peers).length;
		SPS.log(peers);
		if (length > 0) {
			let i = 0;
			let num = SPS.GetRandomNumber(length, 1);
			let highest = null;
			let highestR = 0;
			
			for (var p in peers) {
				let Clients = peers[p].Clients ? peers[p].Clients : 0;
				let Max = peers[p].Max;
				if(peers[p].Rating > highestR && Clients <= Max && p != SPS.id && peers[p].Tier <= SPS.availabletiers ){ //Grab the highest rating connection with less than four connections.
					highestR = peers[p].Rating;
					highest = p;
					SPS.tier = peers[p].Tier + 1;
					SPS.log(highest + " has highest rating at " + highestR);
					
				}
				i = i + 1;
				if (num == i && p != SPS.id && p != null && !SPS.isblocked(p)) {
					if (!SPS.connected && !SPS.isbroadcaster && !highest) {
						highest = p;
						highestR = peers[p].Rating;
						SPS.tier = peers[p].Tier + 1;
						SPS.log("defaulting to random peer " + highest);
					}
				}
			}
			if(highest && !SPS.connected){
				try{$("#tierlabel").html("You are connected to a level " + SPS.tier + " tier");}catch(e){ console.log(e); }
				SPS.currentPeerId = highest;
				SPS.log("Connecting to " + highest);
				SPS.ConnectToPeer(highest);
			}
		}
	});
    //Received call request from viewer
	this.peersocket.on("Call", (pr) => { 
		SPS.peercallaudio = SPS.peeraudio.call(pr + "audio", SPS.recordStreamAudio); 
		SPS.peercallvideo = SPS.peervideo.call(pr + "video", SPS.recordStreamVideo);
	});

	this.ConnectToPeer = (pr) => {
		if (!this.connected) {
			this.log("Unavailable");
			this.connected = true;
			this.mediastreamtemp = new MediaStream();
			this.peersocket.emit("Call", pr, SPS.id);
		}
	};

	this.WatchBroadcast = (rid) => {
		this.video = document.getElementById(this.remotevideoElement);
		this.video.onloadedmetadata = (e) => {
			SPS.video.play();
		};
		this.video.onsuspend = () => {
			SPS.playTries = SPS.playTries + 1;
			SPS.video.play();
			if (SPS.playTries == 3) {
				SPS.playTries = 0;
				if(!this.failIds[this.currentPeerId])
					this.failIds[this.currentPeerId] = 1;
				this.failIds[this.currentPeerId] = this.failIds[this.currentPeerId] + 1;
				SPS.RetryConnection(true);
			}
		};
		this.channelId = rid;
		this.peersocket.emit("join channel",rid);
		if(!this.ARI){
			window.IntervalExists = true;
			this.ARI = setInterval(this.AutoReconnect, 3000);
		}
	};
	this.StartBroadcast = (rid) => {
		$.get("/setliveid/" + rid,()=>{});
		this.video = document.getElementById(this.localvideoElement);
		this.video.onloadedmetadata = (e) => {
			SPS.video.play();
		};
		this.video.onsuspend = () => {
			this.playTries = this.playTries + 1;
			this.video.play();
			if (this.playTries == 3) {
				if(!this.failIds[this.currentPeerId])
					this.failIds[this.currentPeerId] = 1;
				this.failIds[this.currentPeerId] = this.failIds[this.currentPeerId] + 1;
				this.playTries = 0;
				this.RetryConnection(true);
			}
		};
		this.channelId = rid;
		this.peersocket.emit("join channel",rid);
		if(!this.ARI){
			window.IntervalExists = true;
			this.ARI = setInterval(this.AutoReconnect, 3000);
		}
		navigator.mediaDevices.getUserMedia({
			video: true
		}).then((st1) => {
			SPS.video.srcObject = st1;
			SPS.video.play();
			SPS.recordStreamVideo = st1;
			navigator.mediaDevices.getUserMedia({
				audio: true
			}).then((st2) => {
				SPS.recordStreamAudio = st2;
				SPS.isbroadcaster = true;
			});
		});
	};
	return this;
}