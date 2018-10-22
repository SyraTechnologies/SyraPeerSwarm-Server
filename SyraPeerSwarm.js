function SyraPeerSwarm() {
    let SPS = this;
    SPS.speedtested = false;
	SPS.debug = true;
    SPS.availabletiers = 0;
    SPS.remotevideoElement = "remotevideo";
    SPS.localvideoElement = "localvideo";
    SPS.mediastreamtemp = new MediaStream();
    SPS.log = (m) => {
        if (SPS.debug) console.log(m);
    };
    SPS.dataCons = {};
    SPS.currentPeerId = 0;
    SPS.failIds = {};
    SPS.tier = 0;
    SPS.playTries = 0;
	SPS.speedtest = (callback) => {
        if (!SPS.speedtested) {
            SPS.speedtested = true;
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
    SPS.peersocket = io('wss://localhost:443');
    SPS.id = function() {
        let text = "";
        let letters = "abcdefghijklmnopqrstuvwxyz";
        for (var i = 0; i < 16; i++)
            text += letters.charAt(Math.floor(Math.random() * letters.length));
        return text;
    }();
    SPS.options = {
        'constraints': {
            'mandatory': {
                'OfferToReceiveAudio': true,
                'OfferToReceiveVideo': true
            }
        }
    }
    SPS.peeraudio = new Peer(SPS.id + "audio", {
        secure: true,
        port: 3001,
        host: "localhost",
        path: "/peerjs",
		debug:3,
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
                    url: 'stun:stun2.l.google.com:19302'
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
    SPS.peervideo = new Peer(SPS.id + "video", {
        secure: true,
        port: 3001,
        host: "localhost",
        path: "/peerjs",
		debug:3,
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
                    url: 'stun:stun2.l.google.com:19302'
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


    SPS.GetRandomNumber = (upto, not) => {
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

    SPS.isblocked = (peer) => {
        for (var i in SPS.failIds) {
            if (i == peer && SPS.failIds[i] >= 2) {
				SPS.failIds[i] = 1;
                return true;
            }
        }
        return false;
    };
    SPS.BindPeer = () => {
        SPS.peeraudio.on('error', (err) => {
            SPS.log("Peer audio error", JSON.stringify(err));
            if (err.type == "peer-unavailable") {
				SPS.peersocket.emit("delete peer",SPS.currentPeerId);
				console.log("Peer unavailable");
                SPS.RetryConnection(true);
            }
        });
        //Received call from the broadcaster
        SPS.peeraudio.on('call', (call) => {
            if (!SPS.isbroadcaster) {
                SPS.peercallaudioreceive = call;
                //Answer the call from broadcaster
                call.answer(null, SPS.options);
                //On receive stream
                call.on('stream', (stream) => {
                    stream.getAudioTracks().forEach(track => SPS.mediastreamtemp.addTrack(track)); //Merge video and audio tracks into mediastreamtemp
                    stream.oninactive = () => {
                        SPS.connected = false;
                    };
                    //Set video source and play stream.
                    SPS.video.srcObject = SPS.mediastreamtemp;
                    SPS.video.play();
                    SPS.recordStreamAudio = stream;
                    SPS.peersocket.emit("add peer", SPS.id);
                    SPS.speedtest((rating) => {
                        SPS.peersocket.emit("set peer rating", SPS.id, rating);
                        let max = Math.floor(rating / 500);
                        SPS.peersocket.emit("set peer tier", SPS.id, SPS.tier);
                        SPS.peersocket.emit("set peer max", SPS.id, max);
                    });
                    SPS.isrelaying = true;
                });
            }
        });
        SPS.peervideo.on('error', (err) => {
            SPS.log("Peer video error", JSON.stringify(err));
            if (err.type == "peer-unavailable") {
				SPS.peersocket.emit("delete peer",SPS.currentPeerId);
                SPS.connected = false;
                SPS.RetryConnection(true);
            }
        });
        SPS.peervideo.on('call', (call) => { //Received call from broadcaster
            if (!SPS.isbroadcaster) {
                SPS.peercallvideoreceive = call;

                SPS.log("Answering Call");
                //Answer the call from broadcaster
                call.answer(null, SPS.options);
                //On receive stream
                call.on('stream', (stream) => {
                    stream.getVideoTracks().forEach(track => SPS.mediastreamtemp.addTrack(track)); //Merge video and audio tracks into mediastreamtemp
                    stream.oninactive = () => {
                        SPS.RetryConnection(true);
                    };
                    //Set video source and play stream.
                    SPS.video.srcObject = SPS.mediastreamtemp;
                    SPS.video.play();
                    SPS.recordStreamVideo = stream;
                    SPS.peersocket.emit("add peer", SPS.id);
                    SPS.speedtest((rating) => {
                        SPS.peersocket.emit("set peer rating", SPS.id, rating);
                        let max = Math.floor(rating / 500);
                        SPS.peersocket.emit("set peer tier", SPS.id, SPS.tier);
                        SPS.peersocket.emit("set peer max", SPS.id, max);
                    });
                    SPS.isrelaying = true;
                });
            }
        });

    };
    SPS.BindPeer();
    SPS.findStat = (m, type) => [...m.values()].find(s => s.type == type && !s.isRemote);
    SPS.AutoReconnect = () => {
		//SPS.peersocket.emit("get peer list");
        if (window.ClearIntervals) {
            console.log("Clearing interval");
            try {
                clearInterval(SPS.ARI);
            } catch (e) {
                console.log(e);
            }
            window.IntervalExists = false;
            window.ClearIntervals = false;
        }
		console.log(SPS.peervideo.connections);
		for(var i in SPS.peervideo.connections){ let peer = SPS.peervideo.connections[i]; for(var i2 in peer){ let con = peer[i2]; if(!con.pc){SPS.peervideo.connections[i].splice(i2,1);}}}
		for(var i in SPS.peeraudio.connections){ let peer = SPS.peeraudio.connections[i]; for(var i2 in peer){ let con = peer[i2]; if(!con.pc){SPS.peeraudio.connections[i].splice(i2,1);}}}
		let viewers = 0;
		for(var i in SPS.peervideo.connections){
			let peer = SPS.peervideo.connections[i];
			for(var i2 in peer){
				viewers = viewers + 1;
			}
		}
        if (SPS.peervideo)
            SPS.peersocket.emit("set peer clients", SPS.id, viewers);
        SPS.peersocket.emit("get channel clients");
        if(SPS.connected && SPS.isbroadcaster){
			SPS.peersocket.emit("add peer", SPS.id);
		}
		if (SPS.isbroadcaster) {
            SPS.speedtest((rating) => {
                SPS.tier = 0;
                SPS.peersocket.emit("set peer rating", SPS.id, rating);
                let max = Math.floor(rating / 500);
                SPS.peersocket.emit("set peer tier", SPS.id, 0);
                SPS.peersocket.emit("set peer max", SPS.id, max);
            });
        }
        if (!SPS.isbroadcaster) {
            if (SPS.peercallvideoreceive) {
                if (!SPS.peercallvideoreceive.pc) {
                    //If there is no connection then reconnect.
                    SPS.RetryConnection(true);
                    SPS.log("No call exists");
                } else {
                    //If connection exists then check the icestate to see if connected still
                    switch (SPS.peercallvideoreceive.pc.iceConnectionState) {
                        case 'disconnected':
                            SPS.RetryConnection(true);
                            break;
                        case 'failed':
                            SPS.RetryConnection(true);
                            break;
                        case 'new':
                            SPS.RetryConnection(true);
                            break;
                    }
                }
            } else {
                SPS.RetryConnection(true);
            }
        }
    };
    SPS.RetryConnection = (setconnected) => {
		for(var i in SPS.peervideo.connections){
			let peer = SPS.peervideo.connections[i];
			for(var i2 in peer){
				let con = peer[i2];
				if(con.pc){
				con.pc.close();
				con.pc = null;
				}
				if(con.peerConnection){
					con.peerConnection.close();
					con.peerConnection = null;
				}
			}
		}
		for(var i in SPS.peeraudio.connections){
			let peer = SPS.peeraudio.connections[i];
			for(var i2 in peer){
				let con = peer[i2];
				if(con.pc){
				con.pc.close();
				con.pc = null;
				}
				if(con.peerConnection){
					con.peerConnection.close();
					con.peerConnection = null;
				}
			}
		}
        if (SPS.currentPeerId != 0) {
            if (!SPS.failIds[SPS.currentPeerId])
                SPS.failIds[SPS.currentPeerId] = 1;
            SPS.failIds[SPS.currentPeerId] = SPS.failIds[SPS.currentPeerId] + 1;
        }
		SPS.connected = false;
        SPS.recordStreamAudio = null;
        SPS.recordStreamVideo = null;

        SPS.log("Reconnecting to stream");
		//if(!SPS.connected)
		SPS.peersocket.emit("get peer list");
    };
    SPS.peersocket.on("hello", (m) => {
        if (SPS.channelId)
            SPS.peersocket.emit("join channel", SPS.channelId);
    });
    SPS.peersocket.on("channel clients", (m) => {
        SPS.availabletiers = Math.ceil(parseFloat(m) / 4);
        SPS.log(m + " clients");
    });
    SPS.peersocket.on("peer list", (peers) => {
        SPS.log(peers);
        let length = Object.keys(peers).length;
        if (length > 0) {
            let i = 0;
            let num = SPS.GetRandomNumber(length, 1);
            let highest = null;
            let highestR = 0;

            for (var p in peers) {
                let Clients = peers[p].Clients ? peers[p].Clients : 0;
                let Max = peers[p].Max;
                if (peers[p].Rating > highestR && Clients < Max && p != SPS.id && peers[p].Tier <= SPS.availabletiers) { //Grab the highest rating connection with less than four connections.
                    if(p != SPS.currentPeerId){
						highestR = peers[p].Rating;
						highest = p;
						SPS.tier = peers[p].Tier + 1;
						SPS.log(highest + " has highest rating at " + highestR);
					}
                    
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
            if (highest && !SPS.connected) {
                try {
                    $("#tierlabel").html("You are connected to a level " + SPS.tier + " tier");
                } catch (e) {
                    console.log(e);
                }
                SPS.currentPeerId = highest;
                SPS.log("Connecting to " + highest);
				//SPS.peersocket.emit("delete peer", highest);
                SPS.ConnectToPeer(highest);
            }
        }
    });
    //Received call request from viewer
    SPS.peersocket.on("Call", (pr) => {
        if (SPS.recordStreamAudio)
            SPS.peercallaudio = SPS.peeraudio.call(pr + "audio", SPS.recordStreamAudio);
        if (SPS.recordStreamVideo)
            SPS.peercallvideo = SPS.peervideo.call(pr + "video", SPS.recordStreamVideo);
    });
    SPS.ConnectToPeer = (pr) => {
        if (!SPS.connected) {
            SPS.log("Unavailable");
            SPS.connected = true;
            SPS.mediastreamtemp = new MediaStream();
            SPS.peersocket.emit("Call", pr, SPS.id);
        }
    };
    SPS.WatchBroadcast = (rid) => {
        SPS.video = document.getElementById(SPS.remotevideoElement);
		let hasDropped = new Promise(resolve => {
			SPS.icfd = true;
			let lastPackets = countdown = 0,
				timeout = 3; // seconds
			let lastTime = 0;
			let iv = setInterval(() => {
				if(lastTime == SPS.video.currentTime){
					SPS.RetryConnection(true);
					if(SPS.onVideoDrop)
						SPS.onVideoDrop();
				}
				lastTime = SPS.video.currentTime;
			}, 4000);
		});

		hasDropped.then(() => {
			SPS.log("Video was paused too long. Reconnecting");
			SPS.RetryConnection(true);
		}).catch((e) => {
			console.log(e);
		});
		SPS.video.onplay = () => {
		};
        SPS.video.onloadedmetadata = (e) => {
            SPS.video.play();
        };
        SPS.video.onsuspend = () => {
            SPS.RetryConnection(true);
        };
        SPS.channelId = rid;
        SPS.peersocket.emit("join channel", rid);
        if (!SPS.ARI) {
            window.IntervalExists = true;
            SPS.ARI = setInterval(SPS.AutoReconnect, 2000);
        }
    };
    SPS.StartBroadcast = (rid) => {
        $.get("/setliveid/" + rid, () => {});
        SPS.video = document.getElementById(SPS.localvideoElement);
        SPS.video.onloadedmetadata = (e) => {
            SPS.video.play();
        };
        SPS.video.onsuspend = () => {
            SPS.RetryConnection(true);
        };
        SPS.channelId = rid;
        SPS.peersocket.emit("join channel", rid);
        if (!SPS.ARI) {
            window.IntervalExists = true;
            SPS.ARI = setInterval(SPS.AutoReconnect, 2000);
        }
        navigator.mediaDevices.getUserMedia({
            video: true
        }).then((st1) => {
			SPS.connected = true;
            SPS.video.srcObject = st1;
            SPS.video.play();
            SPS.recordStreamVideo = st1;
            navigator.mediaDevices.getUserMedia({
                audio: {sampleRate:48000, channelCount: 2, autoGainControl : false }
            }).then((st2) => {
                SPS.recordStreamAudio = st2;
                SPS.isbroadcaster = true;
            });
        });
    };
    return SPS;
}