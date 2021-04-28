INSERT INTO beacons (id) VALUES ('db559330acb9442398e3248894e62ed1'::UUID);
INSERT INTO beacons (id) VALUES ('2f234454cf6d5a0fadf2f4911ba9ffa7'::UUID);
INSERT INTO readings (rx_beacon, tx_beacon, contact_level, time_stamp) VALUES
	('2f234454cf6d5a0fadf2f4911ba9ffa7'::UUID,
	'db559330acb9442398e3248894e62ed1'::UUID,
	5,
	'2016-06-22 19:10:25-07');
	
INSERT INTO readings (rx_beacon, tx_beacon, contact_level, time_stamp) VALUES
	('2f234454cf6d5a0fadf2f4911ba9ffa7'::UUID,
	'db559330acb9442398e3248894e62ed1'::UUID,
	2,
	'2016-06-22 19:10:25-07');

INSERT INTO alert_queue (beacon_id) VALUES
	('db559330acb9442398e3248894e62ed1'::UUID),
	('2f234454cf6d5a0fadf2f4911ba9ffa7'::UUID);

SELECT * FROM beacons;
SELECT * FROM readings;
SELECT * FROM alert_queue;