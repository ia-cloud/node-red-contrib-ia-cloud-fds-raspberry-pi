
"use strict";

const gpio = require('rpi-gpio');

module.exports = function(RED) {

    const INPUT_TEXT = RED._("runtime.input");
    const ON_VALUE_TEXT = RED._("runtime.on");
    const OFF_VALUE_TEXT = RED._("runtime.off");
    const ERROR_TEXT = RED._("runtime.error");

    function piGPIOout(config) {

        RED.nodes.createNode(this, config);

        const node = this;
        const gpioNum = config.gpioNum
        // set GPIO gpioNum mode
        gpio.setMode(gpio.MODE_BCM);

        gpio.setup(gpioNum, gpio.DIR_OUT, gpio.EDGE_NONE);

        this.on("input",function(msg) {

            if (msg.payload && msg.payload !== "off" 
                && msg.payload !== "reset" && msg.payload !== "stop") {

                gpio.write(gpioNum, true, function(err) {
                    if (!err) {
                        msg.payload = INPUT_TEXT + ":" + msg.payload + " -> " + ON_VALUE_TEXT;
                        node.status({fill:"green", shape:"dot", text:msg.payload});
                    }
                    else {
                        msg.payload = INPUT_TEXT + ":" + msg.payload + " -> " + ERROR_TEXT;
                        node.status({fill:"yellow", shape:"ring", text:msg.payload});
                    }
                });
            }
            else {
                gpio.write(gpioNum, false, function(err) {
                    if (!err) {
                        msg.payload = INPUT_TEXT + ":" + msg.payload + " -> " + OFF_VALUE_TEXT;
                        node.status({fill:"green", shape:"dot", text:msg.payload});
                    }
                    else {
                        msg.payload = INPUT_TEXT + ":" + msg.payload + " -> " + ERROR_TEXT;
                        node.status({fill:"yellow", shape:"ring", text:msg.payload});
                    }
                });
            }
            node.send(msg);
        });
        this.on("close", function(done) {
            // reset GPIO config
            gpio.destroy(function(){done()});
        });
    };

    RED.nodes.registerType("pi-GPIO-out", piGPIOout);
}
