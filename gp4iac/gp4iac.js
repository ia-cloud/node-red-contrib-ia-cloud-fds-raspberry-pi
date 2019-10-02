module.exports = function(RED) {
    "use strict";
    var GrovePiBoard = require('./lib/GrovePiBoard.js');



    // DigitalSensoreNode (Temp/Hum, ..)
    function Gp4iacDigitalSensorNode(config) {
    	// Create this node
        RED.nodes.createNode(this,config);

        var node = this;

      // gp4iac
        this.objectkey = config.objectkey;
        this.dataname1 = config.dataname1;
        this.dataname2 = config.dataname2;
        this.dataname3 = config.dataname3;
        this.unit1 = config.unit1;
        this.unit2 = config.unit2;
        this.unit3 = config.unit3;
        var objectkey = this.objectkey;
        var dataname1 = this.dataname1;
        var dataname2 = this.dataname2;
        var dataname3 = this.dataname3;
        var unit1 = this.unit1;
        var unit2 = this.unit2;
        var unit3 = this.unit3;
        var dataname = [dataname1,dataname2,dataname3];
        var datavalue = new Array(3);
        var unit = [unit1,unit2,unit3];


        // Retrieve the board-config node
       this.boardConfig = RED.nodes.getNode(config.board);
       this.pin = config.pin;
       this.sensor = config.sensor;
       this.repeat = config.repeat;
       var sensortype = this.sensor;

       if (RED.settings.verbose) { this.log("Digital Sensor: Pin: " + this.pin + ", Repeat: " + this.repeat); }


       if(node.boardConfig){
         if(!node.boardConfig.board){
           node.boardConfig.board = new GrovePiBoard();
           node.boardConfig.board.init();
         }

         // Board has been initialised
    	 if (RED.settings.verbose) { this.log("GrovePiDigitalSensor: Configuration Found"); }
         
         this.sensor = node.boardConfig.board.registerSensor('digital', this.sensor, this.pin, this.repeat, function(response) {
        	 var msg = {};
       
       	  	 node.status({fill:"green",shape:"dot",text:"connected"});
             msg.payload = response;
             if (RED.settings.verbose) { node.log("DigitalSensor value: " + response); }

            if(sensortype == "dht11"){
              datavalue[0] = msg.payload.temperature;
              datavalue[1] = msg.payload.humidity;
              datavalue[2] = msg.payload.heatIndex;
            }else if(sensortype == "button"){
              datavalue[0] = msg.payload;
              datavalue[1] = 0;
              datavalue[2] = 0;
            }else{
              datavalue[0] = msg.payload;
              datavalue[1] = 0;
              datavalue[2] = 0;
            }
            Gp4iacMsg(msg);


            //node.send(msg);
         });

         this.on('close', function(done) {
            this.sensor(function(){
                 done();
             });
            if (node.done) {
                node.status({});
                node.done();
            }
            else { node.status({fill:"red",shape:"ring",text:"stopped"}); }
         });

       } else {
         node.error("Node has no configuration!");
         node.status({fill:"red",shape:"ring",text:"error"});
       }


      //変換ファンクション
      function Gp4iacMsg(msg){

        var dateformat = require('dateformat');
        var date = new Date();
        var timestamp = dateformat(date, 'isoDateTime');

        if(sensortype == "dht11"){
            msg = {
                "request": "store",
                "dataObject": {
                    "objectType" : "iaCloudObject",
                    "objectKey" : objectkey ,
                    "objectDescription" : "センサーの値",
                    "timeStamp" :  timestamp,
                    "ObjectContent" : {
                        "contentType": "iaCloudData",
                        "contentData":[{
                            "dataName": dataname[0],
                            "dataValue": datavalue[0],
                            "unit": unit[0]
                        },{
                            "dataName": dataname[1],
                            "dataValue": datavalue[1],
                            "unit": unit[1]
                        },{
                            "dataName": dataname[2],
                            "dataValue": datavalue[2],
                            "unit": unit[2]
                        }]
                    }
                }
                
            }
        }else{
            msg = {
                "request": "store",
                "dataObject": {
                    "objectType" : "iaCloudObject",
                    "objectKey" : objectkey ,
                    "objectDescription" : "センサーの値",
                    "timeStamp" :  timestamp,
                    "ObjectContent" : {
                        "contentType": "iaCloudData",
                        "contentData":[{
                            "dataName": dataname[0],
                            "dataValue": datavalue[0],
                            "unit": unit[0]
                        }]
                    }
                }
                
            }
        }
        node.send(msg);
      }
    }
    RED.nodes.registerType("gp4iac digital sensor",Gp4iacDigitalSensorNode);


    // GrovePi Configuration Node 
    function GrovePiConfigNode(n) {
      // Create this node
      RED.nodes.createNode(this,n);
      
      this.boardType = n.boardType;
      this.name = n.name;
    }
    RED.nodes.registerType("board-config",GrovePiConfigNode);


}
