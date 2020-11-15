
"use strict";

const GrovePi = require('@ia-cloud/node-grovepi').GrovePi;
const DHTDigitalSensor = GrovePi.sensors.DHTDigital;

module.exports = function(RED) {


    function GPiDHTSensor(config) {

        RED.nodes.createNode(this, config);

        const node = this;

        let statusTxt = "";
        let value = {};
        const PRESENT_VALUE_TEXT = RED._("runtime.value");
        const gpNode = RED.nodes.getNode(config.grovepi);
        const gpBoard = gpNode.gpBoard;

        // if grovepi exists and initialized
        if (gpBoard.checkStatus()) {
 
            // make UltrasonicDigitalSensor instantiated
            this.DHTsensor = new DHTDigitalSensor(
                config.din, DHTDigitalSensor.VERSION.DHT11, DHTDigitalSensor.CELSIUS);

            // set data change event listener
            this.DHTsensor.on('change', function (res) {
                if (res) {
                    value.temp = Number(res[0]);
                    value.hum = Number(res[1]);
                    value.hIndex = Number(res[2]);
                    // async send ia-cloud object
                    if (config.storeAsync) iaCloudObjectSend ();
                }
            });
            // start sennsor watch
            this.DHTsensor.watch(config.cycle * 1000);
   
        }
    
        const minCycle = 1; // 最小収集周期を10秒に設定
        // 定期収集のためのカウンターをセット
        let storeInterval = parseInt(config.storeInterval);
        let timeCount = storeInterval;

        // Nodeステータスを　Readyに
        statusTxt = RED._("runtime.waiting");

        if (storeInterval !== 0) {
            this.intervalId = setInterval(function(){
                // 設定された格納周期で,PLCCom Nodeからデータを取得し、ia-cloudオブジェクトを
                // 生成しメッセージで送出
                // 複数の周期でオブジェクトの格納をするため、1秒周期でカウントし、カウントアップしたら、
                // オブジェクト生成、メッセージ出力を行う。

                // 収集周期前であれば何もせず
                timeCount = timeCount - minCycle;  
                if (timeCount > 0) return;
                
                // 収集周期がきた。収集周期を再設定。
                timeCount = storeInterval;
                iaCloudObjectSend();
                
            }, (minCycle * 1000));
        }

        this.on("input",function(msg) {
            if (msg.payload) iaCloudObjectSend();
        });

        this.on("close",function(done) {
            // stop Grovrpi sensor watch
            this.DHTsensor.stopWatch();
            // stop cyclic ia-cloud object stor
            clearInterval(this.intervalId)
            // just in case
            setTimeout(done, 300);
        });

        // ia-cloudオブジェクトを出力メッセージとして送出する関数
        function iaCloudObjectSend () {
            const moment = require("moment");

            if (!value) return;
            let msg = {request:"store", dataObject:{objectContent:{}}};
            let contentData = [
                {
                    dataName: config.tempDataName,
                    dataValue: value.temp,
                    unit: config.tempUnit
                },{
                    dataName: config.humDataName,
                    dataValue: value.hum,
                    unit: config.humUnit
                },{
                    dataName: config.hIndexDataName,
                    dataValue: value.hIndex
                }
            ];
            msg.dataObject.objectKey = config.objectKey;
            msg.dataObject.timestamp = moment().format();
            msg.dataObject.objectType = "iaCloudObject";
            msg.dataObject.objectDescription = config.objectDescription;
            msg.dataObject.objectContent.contentType = "iaCloudData";

            msg.dataObject.objectContent.contentData = contentData;
            // set contentData[] to msg.payload
            msg.payload = contentData;
            // Send output message to the next Nodes
            node.send(msg);
            // make Node status to "sent"
            statusTxt = RED._("runtime.sent");
            node.status({fill:"green", shape:"dot",
                text: PRESENT_VALUE_TEXT + value.temp + ":" + statusTxt});
        }
    };

    RED.nodes.registerType("GPi-DHT-sensor",GPiDHTSensor);
}
