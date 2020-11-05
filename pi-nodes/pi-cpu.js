
"use strict";

const { exec } = require('child_process');
const INTERVAL = 10 * 1000;
const MINCYCLE = 1;

module.exports = function(RED) {


    function piCpu(config) {

        RED.nodes.createNode(this, config);

        const node = this;

        let statusTxt = "";
        let value = {};
        let preValue = {};
        const PRESENT_VALUE_TEXT = RED._("runtime.value");

        // if grovepi exists and initialized
        if (INTERVAL) {
 
            this.watchId = setInterval(function () {

                exec("cat /sys/class/thermal/thermal_zone0/temp", (err,stdout, stderr) => {
                    preValue.CPUtemp = value.CPUtemp;
                    value.CPUtemp = parseInt(stdout) / 1000;
                });
                exec("vmstat | tail -1 | awk '{print $15}'", (err,stdout, stderr) => {
                    preValue.CPUinUse = value.CPUinUse;
                    value.CPUinUse = 100 - parseInt(stdout);
                });
                exec("vmstat | tail -1 | awk '{print $4}'", (err,stdout, stderr) => {
                    preValue.mem = value.mem;
                    value.mem = parseInt(stdout) / 1000;
                });
                if (config.storeAsync) {
                    if (preValue.CPUtemp !== value.CPUtemp 
                        || preValue.CPUinUse !== value.CPUinUse
                        || preValue.mem !== value.mem) {
                            iaCloudObjectSend();       
                    }
                }

            }, INTERVAL);
   
        }
    
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
                    dataName: config.CPUtempDataName,
                    dataValue: value.CPUtemp,
                    unit: config.CPUtempUnit
                },{
                    dataName: config.CPUinUseDataName,
                    dataValue: value.CPUinUse,
                    unit: config.CPUinUseUnit
                },{
                    dataName: config.memDataName,
                    dataValue: value.mem,
                    unit: config.memUnit
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
                text: PRESENT_VALUE_TEXT + value.CPUtemp + ":" + statusTxt});
        }
    };

    RED.nodes.registerType("pi-cpu",piCpu);
}
