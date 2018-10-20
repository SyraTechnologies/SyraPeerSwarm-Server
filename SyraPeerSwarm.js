function SyraPeerSwarm() {
    let SPS = this;
    this.speedtested = false;
    this.speedtest = (callback) => {
        if (!this.speedtested) {
            this.speedtested = true;
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
    this.peersocket = io('wss://localhost:443');
    this.id = function() {
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
    this.debug = true;
    this.availabletiers = 0;
    this.remotevideoElement = "remotevideo";
    this.localvideoElement = "localvideo";
    this.mediastreamtemp = new MediaStream();
    this.log = (m) => {
        if (this.debug) console.log(m);
    };
    this.dataCons = {};
    this.currentPeerId = 0;
    this.failIds = {};
    this.tier = 0;
    this.playTries = 0;
    this.peeraudio = new Peer(this.id + "audio", {
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
    this.peervideo = new Peer(this.id + "video", {
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
            SPS.log("Peer audio error", JSON.stringify(err));
            if (err.type == "peer-unavailable") {
                SPS.connected = false;
                SPS.RetryConnection(true);
            }
        });
        //Received call from the broadcaster
        this.peeraudio.on('call', (call) => {
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
        this.peervideo.on('error', (err) => {
            SPS.log("Peer video error", JSON.stringify(err));
            if (err.type == "peer-unavailable") {
                SPS.connected = false;
                SPS.RetryConnection(true);
            }
        });
        this.peervideo.on('call', (call) => { //Received call from broadcaster
            if (!this.isbroadcaster) {
                SPS.peercallvideoreceive = call;


                let hasDropped = new Promise(resolve => {
                    SPS.icfd = true;
                    let lastPackets = countdown = 0,
                        timeout = 3; // seconds
                    let iv = setInterval(() => {
                        try {
                            call.pc.getStats().then(stats => {
                                let packets = null;
                                try {
                                    packets = SPS.findStat(stats, "inbound-rtp").packetsReceived;
                                } catch (e) {
                                    resolve(clearInterval(iv));
                                }
                                countdown = (packets - lastPackets) ? timeout : countdown - 1;
                                if (!countdown) {
                                    SPS.icfd = false;
                                    resolve(clearInterval(iv));
                                }
                                lastPackets = packets;
                            })
                        } catch (e) {
                            resolve(clearInterval(iv));
                        }
                    }, 1000);

                });

                hasDropped.then(() => {
                    SPS.RetryConnection(true);
                }).catch((e) => {
                    console.log(e);
                });

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
    this.BindPeer();
    this.findStat = (m, type) => [...m.values()].find(s => s.type == type && !s.isRemote);
    this.AutoReconnect = () => {

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

        if (SPS.peervideo)
            SPS.peersocket.emit("set peer clients", SPS.id, Object.keys(SPS.peervideo.connections).length - 1);
        SPS.peersocket.emit("get channel clients");
        if (SPS.isbroadcaster) {
            SPS.peersocket.emit("add peer", SPS.id);
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
    this.RetryConnection = (setconnected) => {
        if (this.currentPeerId != 0) {
            if (!this.failIds[this.currentPeerId])
                this.failIds[this.currentPeerId] = 1;
            this.failIds[this.currentPeerId] = this.failIds[this.currentPeerId] + 1;
        }
        if (setconnected) {
            this.connected = false;
        }
        this.recordStreamAudio = null;
        this.recordStreamVideo = null;

        this.log("Reconnecting to stream");
        this.peersocket.emit("get peer list");
    };
    this.peersocket.on("hello", (m) => {
        if (SPS.channelId)
            SPS.peersocket.emit("join channel", SPS.channelId);
    });
    this.peersocket.on("channel clients", (m) => {
        SPS.availabletiers = Math.ceil(parseFloat(m) / 4);
        SPS.log(m + " clients");
    });
    this.peersocket.on("peer list", (peers) => {
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
                if (peers[p].Rating > highestR && Clients <= Max && p != SPS.id && peers[p].Tier <= SPS.availabletiers) { //Grab the highest rating connection with less than four connections.
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
            if (highest && !SPS.connected) {
                try {
                    $("#tierlabel").html("You are connected to a level " + SPS.tier + " tier");
                } catch (e) {
                    console.log(e);
                }
                SPS.currentPeerId = highest;
                SPS.log("Connecting to " + highest);
                SPS.ConnectToPeer(highest);
            }
        }
    });
    //Received call request from viewer
    this.peersocket.on("Call", (pr) => {
        if (SPS.recordStreamAudio)
            SPS.peercallaudio = SPS.peeraudio.call(pr + "audio", SPS.recordStreamAudio);
        if (SPS.recordStreamVideo)
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
            SPS.RetryConnection(true);
        };
        this.channelId = rid;
        this.peersocket.emit("join channel", rid);
        if (!this.ARI) {
            window.IntervalExists = true;
            this.ARI = setInterval(this.AutoReconnect, 3000);
        }
    };
    this.StartBroadcast = (rid) => {
        $.get("/setliveid/" + rid, () => {});
        this.video = document.getElementById(this.localvideoElement);
        this.video.onloadedmetadata = (e) => {
            SPS.video.play();
        };
        this.video.onsuspend = () => {
            SPS.RetryConnection(true);
        };
        this.channelId = rid;
        this.peersocket.emit("join channel", rid);
        if (!this.ARI) {
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