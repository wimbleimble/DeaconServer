const Pool = require("pg").Pool;
const pool = new Pool({
	user: "wimbl",
	host: "localhost",
	database: "deacon",
	password: "'\\{\\W^+ERTMj4a[R",
});

pool.query("SELECT * FROM beacons;").then(res =>
{
	console.log(res);
});