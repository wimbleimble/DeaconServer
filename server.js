const ws = require("ws");
const server = new ws.Server({ port: 6969 });

server.on("connection", socket =>
{
	socket.on("message", msg =>
	{
		console.log("recieved %s", msg);
	});
	socket.send("Hello!");
	console.log("connected");
});