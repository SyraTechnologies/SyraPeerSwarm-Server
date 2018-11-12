<h1>SyraPeerSwarm</h1>
This is an attempt to use peerjs to create a scalable p2p video system. It rates connections based upon upload speed. Each peer is eventually required to relay the stream. By doing this we create a stable network with tiers of availability. Each tier is a relay from another peer in the group. By grouping we get rid of the issue of peers leaving causing the chain to break forcing everyone in the chain to reconnect.

<h1>Recent additions:</h1>
Added a rating system to rate peers based on their connection.<br/>
Added a check to determine, from the rating system, the amount of connections a peer can support.<br/>
Added in additional methods of detecting when the stream has been interrupted.<br/>
