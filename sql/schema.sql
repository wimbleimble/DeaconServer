CREATE TABLE beacons (
	id UUID NOT NULL,
	PRIMARY KEY(id)
);

CREATE TABLE readings (
	id SERIAL,
	rx_beacon UUID NOT NULL,
	tx_beacon UUID NOT NULL,
	contact_factor SMALLINT NOT NULL,
	time_stamp TIMESTAMP NOT NULL,
	
	PRIMARY KEY(id),
	FOREIGN KEY(rx_beacon) REFERENCES beacons(id) ON DELETE CASCADE,
	FOREIGN KEY(tx_beacon) REFERENCES beacons(id) ON DELETE CASCADE
);

CREATE TABLE alert_queue (
	id SERIAL,
	beacon_id UUID NOT NULL,
	
	PRIMARY KEY(id),
	FOREIGN KEY(beacon_id) REFERENCES beacons(id) ON DELETE CASCADE
);
