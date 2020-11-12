
"use strict";

const GrovePi = require('../util/node-grovepi/index.js').GrovePi;
const DigitalOut = GrovePi.sensors.DigitalOutput;

module.exports = function(RED) {

    const ON_VALUE_TEXT = RED._("runtime.on");
    const OFF_VALUE_TEXT = RED._("runtime.off");

    function GPiLED(config) {

        RED.nodes.createNode(this, config);

        const node = this;
        let led;

        const gpNode = RED.nodes.getNode(config.grovepi);
        const gpBoard = gpNode.gpBoard;

        // if grovepi exists and initialized
        if (gpBoard.checkStatus()) {
            // make UltrasonicDigitalSensor instantiated
            led = new DigitalOut(parseInt(config.din));
        }

        this.on("input",function(msg) {

            if (msg.payload && msg.payload !== "off" 
                && msg.payload !== "reset" && msg.payload !== "stop") {

                led.turnOn();
                msg.payload = ON_VALUE_TEXT + ": " + msg.payload
                node.status({fill:"green", shape:"dot", text: msg.payload});
            }
            else {
                led.turnOff();
                msg.payload = OFF_VALUE_TEXT + ": " + msg.payload
                node.status({fill:"green", shape:"dot", text:msg.payload});
            }
            node.send(msg);
        });
    };

    RED.nodes.registerType("GPi-LED",GPiLED);
}
