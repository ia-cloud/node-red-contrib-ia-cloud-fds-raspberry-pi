
"use strict";

const GrovePi = require('node-grovepi').GrovePi;
const DigitalIn = GrovePi.sensors.DigitalInput;

const ON_VALUE = 1;
const OFF_VALUE = 0;
const CYCLE = 100;

module.exports = function(RED) {

    function GPiButtonSensor(config) {

        RED.nodes.createNode(this, config);

        const node = this;
        let button = OFF_VALUE;
        let preButton = OFF_VALUE;
        let value;
        let statusTxt = "";
        const PRESENT_VALUE_TEXT = RED._("runtime.value");
        const mode = config.mode;
        const gpNode = RED.nodes.getNode(config.grovepi);
        const gpBoard = gpNode.gpBoard;

        // if grovepi exists and initialized
        if (gpBoard.checkStatus()) {

            // make UltrasonicDigitalSensor instantiated
            let Button = new DigitalIn(parseInt(config.din));

            this.intervalId = setInterval(function () {
                let res = Button.read()
                if (res === false) return;
                preButton = button;
                button = res;
                if (preButton !== button) iaCloudObjectSend(button);
            }, CYCLE)
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
        // called ato deploy timing
        this.on("close",function(done) {
            // stop Grovrpi sensor watch
            this.Button.stopWatch();
            // stop cyclic ia-cloud object stor
            clearInterval(this.intervalId)
            // just in case
            setTimeout(done, 300);
        });

        // ia-cloudオブジェクトを出力メッセージとして送出する関数
        function iaCloudObjectSend (btn) {
            const moment = require("moment");

            let contentType;
            switch (mode) {
                case "opStatus":
                    if (btn === ON_VALUE) value = "start";
                    else if (btn === OFF_VALUE) value = "stop";
                    else value = (preButton === ON_VALUE)? "on": "off";
                    contentType = "iaClodEquipmentstatus";
                    break;
                case "AnE":
                    if (btn === ON_VALUE) value = "set";
                    else if (btn === OFF_VALUE) value = "reset";
                    else value = (preButton === ON_VALUE)? "on": "off";
                    contentType = "iacloudalarm&Event";
                    break;
                case "onOff":
                    if (btn === ON_VALUE) value = "on";
                    else if (btn === OFF_VALUE) value = "off";
                    else value = (preButton === ON_VALUE)? "on": "off";
                    contentType = "iaCloudData";
                    break;
                case "bool":
                    if (btn === ON_VALUE) value = true;
                    else if (btn === OFF_VALUE) value = false;
                    else value = (preButton === ON_VALUE)? true: false;
                    contentType = "iaCloudData";
                    break;
                case "01":
                    if (btn === ON_VALUE) value = 1;
                    else if (btn === OFF_VALUE) value = 0;
                    else value = (preButton === ON_VALUE)? 1: 0;
                    contentType = "iaCloudData";
                    break;
                default:
            }

            let msg = {request:"store", dataObject:{objectContent:{}}};
            let contentData = [{
                dataName: config.dataName,
                dataValue: value,
                unit: config.unit
            }];
            msg.dataObject.objectKey = config.objectKey;
            msg.dataObject.timestamp = moment().format();
            msg.dataObject.objectType = "iaCloudObject";
            msg.dataObject.objectDescription = config.objectDescription;
            msg.dataObject.objectContent.contentType = contentType;

            msg.dataObject.objectContent.contentData = contentData;
            // set contentData[] to msg.payload
            msg.payload = contentData;
            // Send output message to the next Nodes
            node.send(msg);
            // make Node status to "sent"
            statusTxt = RED._("runtime.sent");
            node.status({fill:"green", shape:"dot",
                text: PRESENT_VALUE_TEXT + value + ":" + statusTxt});
        }
    };

    RED.nodes.registerType("GPi-button-sensor",GPiButtonSensor);
}
