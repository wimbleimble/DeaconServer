const ws = require("ws");
const rl = require("readline");
const scheduler = require("node-schedule");
const Pool = require("pg").Pool;
const Filter = require("kalman.js");

const server = new ws.Server({ port: 6969 });
const pool = new Pool({
	user: "wimbl",
	host: "localhost",
	database: "deacon",
	password: "'\\{\\W^+ERTMj4a[R",
});

const thresholdContactFactor = 3;


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
			this.upload(this.processReadings());
			return new Idle();
		}
		else
		{
			const items = line.split(',');
			const uuid = items[1];
			const reading = {
				timestamp: new Date(items[0]),
				rssi: +items[2]
			};

			if (!Object.keys(this.readings).includes(uuid))
				this.readings[uuid] = [[reading]];
			else
			{
				const prevSet = this.readings[uuid][this.readings[uuid].length - 1];
				const prevReading = prevSet[prevSet.length - 1];
				const elapsedTime = reading.timestamp.getTime() - prevReading.timestamp.getTime();
				if (elapsedTime < 0)
					console.log("broken reading");
				else if (elapsedTime < 10000)
					prevSet.push(reading);
				else
					this.readings[uuid].push([reading]);
			}
		}
	}

	growth(pos)
	{
		let factor = 1 / dummyData.rssi.length;
		let growth = 1 + factor;
		let decay = 1 - factor / 1.5;
		if (pos < 0 || pos > 1)
		{
			console.log("Inavlid position.")
			return 1;
		}
		return pos < 0.5 ? decay : growth;
	}

	async processReadings()
	{
		const ret = [];
		Object.keys(this.readings).forEach(uuid =>
		{
			this.readings[uuid].forEach(set =>
			{
				let kalman = new Filter({
					num: set.length, growthFunc: this.growth, R: 0.01, Q: 10
				});

				let min = null;
				set.forEach(reading =>
				{
					let entry = {
						timestamp: reading.timestamp,
						contact_factor: (7.5 * kalman.filter(reading.rssi) + 50)
					};
					if (min === null)
						min = entry;
					else if (entry.contact_factor < min.contact_factor)
						min = entry;
				});

				if (min.contact_factor < thresholdContactFactor)
					ret.push({ uuid: uuid, ...min });
			});

		});
		return ret;
	}

	async upload(readings) // good lord this is slow
	{
		console.log(`Adding ${readings.length} readings to database...`);
		const addBeaconIfAbsent = async uuid =>
		{
			if ((await pool.query("SELECT * FROM beacons WHERE id=$1::UUID;",
				[uuid])).rowCount === 0)
				await pool.query("INSERT INTO beacons (id) VALUES ($1::UUID);",
					[uuid]);
		};

		await addBeaconIfAbsent(this.uuid);

		readings.forEach(async r =>
		{
			await addBeaconIfAbsent(r.uuid);
			await pool.query("INSERT INTO readings \
				(rx_beacon, tx_beacon, contact_factor, time_stamp) VALUES \
				($1::UUID, $2::UUID, $3, $4);",
				[this.uuid, r.uuid, r.rssi, r.timestamp]);
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
