'use strict';

module.exports = function(RED) {
	const LTR559 = require('@bezuidenhout/ltr559-sensor');

	function ltr559(config) {
		RED.nodes.createNode(this,config);
		var node = this;

		node.bus = parseInt(config.bus);
        node.addr = parseInt(config.address, 16);
        node.topic = config.topic || "";
		node.initialized = false;
        node.init_errors = 0;

		// init the sensor
        node.status({ fill: "grey", shape: "ring", text: "Init..." });
		node.log("Initializing on bus" + node.bus + " addr:" + node.addr);
		node.sensor = new LTR559({ i2cBusNo: node.bus, i2cAddress: LTR559.LTR559_DEFAULT_I2C_ADDRESS() });
		var fnInit = function() {
			node.sensor.init().then(function (partId) {
                node.initialized = true;
				node.partID = partId
                node.status({ fill: "green", shape: "dot", text: node.type + " ready" });
                node.log("Sensor with Part ID 0x" + node.partID.toString(16) + " initialized.");
            }).catch(function (err) {
                node.initialized = false;
                node.init_errors++;
                node.status({ fill: "red", shape: "ring", text: "Sensor Init Failed" });
                node.error("Sensor Init failed [" + node.init_errors + "]-> " + err);
                if(node.init_errors > MAX_INIT_ERRORS) {
                    node.error("Init failed more than " + MAX_INIT_ERRORS + " times. The senser will remain in failed stated.");
                }
            });
		};
        // Init
        fnInit();

		node.on('input', function(msg) {
			if (!node.initialized) {
                // try to reinit node until no sensor is found with max retries
                if(node.init_errors <= MAX_INIT_ERRORS) fnInit();
            }
			if (!node.initialized) {
                node.send(msg); // msg bypass
            } else {
				node.sensor.readSensorData().then(function (data) {
					msg.payload = data;
                    node.send(msg);
				}).catch(function (err) {
                    node.status({ fill: "red", shape: "ring", text: "Sensor reading failed" });
                    node.error("Failed to read data ->" + err);
                    node.send(_msg); // msg bypass
                });
			}
            return null;
		});
	}
	RED.nodes.registerType("ltr559", ltr559);
}
