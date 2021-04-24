const ws = require("ws");
const rl = require("readline");
const server = new ws.Server({ port: 6969 });

server.on("connection", socket =>
{
	const duplex = ws.createWebSocketStream(socket, { encoding: 'utf8' });

	const i = rl.createInterface({
		input: duplex
	});

	i.on("line", line =>
	{
		console.log(line);
		if (line.includes("chk:"))
			socket.send("y")
	});
	console.log("connected");
});