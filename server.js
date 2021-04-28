const ws = require("ws");
const rl = require("readline");
const scheduler = require("node-schedule");
const Pool = require("pg").Pool;
const { KalmanFilter } = require("kalman-filter");

const server = new ws.Server({ port: 6969 });
const pool = new Pool({
	user: "wimbl",
	host: "localhost",
	database: "deacon",
	password: "'\\{\\W^+ERTMj4a[R",
});

class Idle
{
	go(socket, line)
	{
		if (line.includes("uuid:"))
			return new GetData(line.slice(5));
		else if (line.includes("chk:"))
			socket.send(checkContact(line.slice(4)) ? "y" : "n");
		else if (line.includes("uhoh:"))
			alertContact(line.slice(5))
		else
			console.log(`Received '${line}'. Dunno what that means`);
	}
}

class GetData 
{
	constructor(uuid)
	{
		this.uuid = uuid;
		this.readings = [];
		this.timeout = setTimeout(() => { state = new Idle() }, 5000);
	}
	async go(socket, line)
	{
		if (line === "done")
		{
			await clearTimeout(this.timeout);
			//await this.processReadings();
			this.upload();
			return new Idle();
		}
		else
		{
			let items = line.split(',');
			if (items.length === 3)
				this.readings.push({
					ts: new Date(items[0]),
					uuid: items[1],
					rssi: +items[2]
				});
		}
	}

	async processReadings()
	{
		//contact = 5.1773ln(x) + 60.768
		let rawData = [];
		this.readings.forEach(reading =>
		{
			rawData.push(reading.rssi);
		})
		const kFilter = new KalmanFilter();
		const kFilteredResults = kFilter.filterAll(rawData);
		kFilteredResults.forEach(async (res, index) =>
		{
			this.readings[index].contact_factor =
				Math.round(-5 * Math.log(res) + 60);
		});

	}

	async upload() // good lord this is slow
	{
		console.log(`Adding ${this.readings.length} readings to database...`);
		const addBeaconIfAbsent = async uuid =>
		{
			if ((await pool.query("SELECT * FROM beacons WHERE id=$1::UUID;",
				[uuid])).rowCount === 0)
				await pool.query("INSERT INTO beacons (id) VALUES ($1::UUID);",
					[uuid]);
		};

		await addBeaconIfAbsent(this.uuid);

		this.readings.forEach(async r =>
		{
			await addBeaconIfAbsent(r.uuid);
			await pool.query("INSERT INTO readings \
				(rx_beacon, tx_beacon, contact_factor, time_stamp) VALUES \
				($1::UUID, $2::UUID, $3, $4);",
				[this.uuid, r.uuid, r.rssi, r.ts]);
		});
	}
}

function checkContact(uuid)
{
	return true;
}

function alertContact(uuid)
{
	console.log(`alerting ${uuid}`);
}

server.on("connection", socket =>
{
	let state = new Idle();
	const duplex = ws.createWebSocketStream(socket, { encoding: 'utf8' });

	const i = rl.createInterface({
		input: duplex
	});

	i.on("line", async line =>
	{
		let ret = await state.go(socket, line);
		if (ret !== undefined)
			state = ret;
	});
});
const wipe = scheduler.scheduleJob("* * * * * 0", () =>
{
	console.log("Wiping outdated data.");
});
