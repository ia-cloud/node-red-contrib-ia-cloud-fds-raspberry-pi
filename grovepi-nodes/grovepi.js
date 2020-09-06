/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

"use strict";

const GrovePi = require('node-grovepi').GrovePi
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
