
"use strict";

const gpio = require('rpi-gpio');
const INTERVAL = 10 * 1000;
const MINCYCLE = 1;
const NUM_OF_GPIO_PIN = 44;

module.exports = function(RED) {


    function piGPIOin (config) {

        RED.nodes.createNode(this, config);

        const node = this;
        const params = config.dataItems;
        const mode = config.mode;
        let GPIOValue = [];
        GPIOValue.length = NUM_OF_GPIO_PIN;

        const ERROR_TEXT = RED._("runtime.error");
        const SENT_TEXT = RED._("runtime.sent");
        const WAITING_TEXT = RED._("runtime.waiting");

        // set GPIO pin mode
        gpio.setMode(gpio.MODE_BCM);
            
        gpio.on("change", function (channel, value) {

            let param = params.find(param => {return param.gpioNum == channel});
            if (param) {
                if (value && !GPIOValue[channel]) iaCloudObjectSend(param, "raised");
                else  if (!value && GPIOValue[channel]) iaCloudObjectSend(param, "falled");
            }
            GPIOValue[channel] = value;
        });
        // make node status waiting
        node.status({fill:"green", shape:"dot", text:WAITING_TEXT});

        // set GPIO pins up
        for (let param of params) {

            gpio.setup(param.gpioNum, gpio.DIR_IN, gpio.EDGE_BOTH, function (err){
                gpio.read(param.gpioNum, function (err, value){

                    if (!err) GPIOValue[param.gpioNum] = value;
                    else node.status({fill:"yellow", shape:"ring", text:ERROR_TEXT});
                });
            });
        }
    
        // 定期収集のためのカウンターをセット
        let storeInterval = parseInt(config.storeInterval);
        let timeCount = storeInterval;

        if (storeInterval !== 0) {
            this.intervalId = setInterval(function(){
                // 設定された格納周期で,PLCCom Nodeからデータを取得し、ia-cloudオブジェクトを
                // 生成しメッセージで送出
                // 複数の周期でオブジェクトの格納をするため、1秒周期でカウントし、カウントアップしたら、
                // オブジェクト生成、メッセージ出力を行う。

                // 収集周期前であれば何もせず
                timeCount = timeCount - MINCYCLE;  
                if (timeCount > 0) return;
                
                // 収集周期がきた。収集周期を再設定。
                timeCount = storeInterval;
                iaCloudObjectSend();
                
            }, MINCYCLE * 1000);
        }

        this.on("input",function(msg) {
            if (msg.payload) iaCloudObjectSend();
        });

        this.on("close",function(done) {
            // stop status watch
            clearInterval(this.watchId);
            // stop cyclic ia-cloud object store
            clearInterval(this.intervalId);

            // reset GPIO config
            gpio.destroy(done);
        });

        // ia-cloudオブジェクトを出力メッセージとして送出する関数
        function iaCloudObjectSend (param, edge) {
            const moment = require("moment");
            let msg = {};
            let dataItems = []; 
            let dataItem = {};
            let value;

            if (!param) {
                for (let i = 0; i < params.length; i++) {
                    value = GPIOValue[params[i].gpioNum];
                    if (value) {
                        if (mode === "opStatus" || mode === "AnE" || mode === "onOff") value = "on";
                        else if (mode === "01") value = 1;
                    } else {
                        if (mode === "opStatus" || mode === "AnE" || mode === "onOff") value = "off";
                        else if (mode === "01") value = 0;
                    }
                    dataItem = {
                        dataName: params[i].dataName,
                        dataValue: value
                    }
                    dataItems.push(dataItem);
                }
            } else {
                dataItems = [{dataName: param.dataName}];
                let value;
                if (edge === "raised") {
                    if (mode === "opStatus") value = "start";
                    else if (mode === "AnE") value = "set";
                    else if (mode === "onOff") value = "on";
                    else if (mode === "bool") value = true;
                    else if (mode === "01") value = 1;
                }
                else if (edge === "falled") {
                    if (mode === "opStatus") value = "stop";
                    else if (mode === "AnE") value = "reset";
                    else if (mode === "onOff") value = "off";
                    else if (mode === "bool") value = false;
                    else if (mode === "01") value = 0;
                }
                dataItems[0].dataValue = value;
            }

            msg.request = "store";

            msg.dataObject = {};
            msg.dataObject.objectKey = config.objectKey;
            msg.dataObject.timestamp = moment().format();
            msg.dataObject.objectType = "iaCloudObject";
            msg.dataObject.objectDescription = config.objectDescription;

            msg.dataObject.objectContent = {};
            msg.dataObject.objectContent.contentType = "iaCloudData";
            msg.dataObject.objectContent.contentData = dataItems;
            // set contentData[] to msg.payload
            msg.payload = dataItems;
            // Send output message to the next Nodes
            node.send(msg);
            // make Node status to "sent"
            node.status({fill:"green", shape:"dot",
                text: SENT_TEXT + dataItems[0].dataValue + "..." });
        }
    };

    RED.nodes.registerType("pi-GPIO-in", piGPIOin);
}
