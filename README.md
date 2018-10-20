<h1>SyraPeerSwarm</h1>
This is an attempt to use peerjs to create a scalable p2p video system. It rates connections based upon upload speed. Each peer is eventually required to relay the stream. Each peer capable will host 4 other streams. By doing this we create a stable network with tiers of availability. Each tier is a relay from another peer in the chain. By grouping we get rid of the issue of peers leaving causing the chain to break forcing everyone in the chain to reconnect.

<br/><br/>
<code>
SP = new SyraPeerSwarm();
</code><br/>
<code>
SP.StartBroadcast("CHANNEL ID");
</code><br/>
<code>
SP.WatchBroadcast("CHANNEL ID");
</code><br/>
<code>
SP.remotevideoElement = "remotevideo"; //Viewer
</code>
<code>
SP.localvideoElement = "localvideo"; //Broadcaster
</code>


<h1>Recent additions:</h1><br/>
Added a rating system to rate peers based on their connection.<br/>
Added a check to determine, from the rating system, the amount of connections a peer can support.<br/>
Added in additional methods of detecting when the stream has been interrupted.<br/>
