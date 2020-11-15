
"use strict";

const GrovePi = require('@ia-cloud/node-grovepi').GrovePi
const Board = GrovePi.board

module.exports = function(RED) {

    function grovePi(config) {

        RED.nodes.createNode(this, config);

        const node = this;

        const gpBoard = new Board({
            debug: false,
            onError: function (err) {
                // if grove board has already initialized, ignore error
                if (err.message === "GrovePI is already initialized") return;
                // the other
                else throw err;
            },
            onInit: function (res) {
                if (true) {
                    // do nothing
                }
            }
        })
        gpBoard.init();
        this.gpBoard = gpBoard;

        this.on("close", function (done) {
            gpBoard.close();
            gpBoard.wait(500);
            done();
        });

    }

    RED.nodes.registerType("grovepi",grovePi);
}
