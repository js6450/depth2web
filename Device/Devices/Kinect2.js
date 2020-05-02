'use strict';

const Device = require('../Device');
let kinect2;

let DEPTHWIDTH = 512;
let DEPTHHEIGHT = 424;
let COLORWIDTH = 1920;
let COLORHEIGHT = 1080;

class Kinect2 extends Device{
    init(){

        if(process.platform !== "darwin"){
            kinect2 = require('kinect2');
        }

        this.kinect = new kinect2();

        this.depthFeed = false;
        this.colorFeed = false;
        this.colorpix = [];
        this.depthpix = [];

        this.busy = false;

        console.log("kinect2 device initialized");
    }

    start(){
        if(this.kinect.open()){
            this.kinect.on("multiSourceFrame", function(frame){
                if(this.busy){
                    return;
                }
                this.busy = true;

                if(frame.color){
                    this.busy = true;
                    this.colorpix = frame.color.buffer;
                    if(this.colorFeed){
                        this.onColorFrame({data: this.getColor(), width: COLORWIDTH, height: COLORHEIGHT, channel: 4});
                    }
                }

                if(frame.depth){

                    this.depthpix = frame.depth.buffer;

                    if(this.depthFeed){
                        this.onDepthFrame({data: this.getDepth(), width: DEPTHWIDTH, height: DEPTHHEIGHT, channel: 4});
                    }
                }
                this.busy = false;
            }.bind(this));
        }
        this.kinect.openMultiSourceReader({
            frameTypes: kinect2.FrameType.color | kinect2.FrameType.depth
        });
    }

    getDepth(){

        if(!this.depthFeed){
            this.depthFeed = true;
        }

        let imageDataArray = [];
        let imagesize = DEPTHWIDTH * DEPTHHEIGHT * 4;
        let depthPixelIndex = 0;

        for (let i = 0; i < imagesize; i += 4) {
            imageDataArray[i] = this.depthpix[depthPixelIndex];
            imageDataArray[i + 1] = this.depthpix[depthPixelIndex];
            imageDataArray[i + 2] = this.depthpix[depthPixelIndex];
            imageDataArray[i + 3] = 0xff;

            depthPixelIndex++;
        }

        return imageDataArray;
    }

    getColor(){
        if(!this.colorFeed){
            this.colorFeed = true;
        }

        let imagesize = COLORWIDTH * COLORHEIGHT * 4;
        let imageDataArray = [];

        for (let i = 0; i < imagesize; i++) {
            imageDataArray[i] = this.colorpix[i];
        }

        return imageDataArray
    }

    stop(){
        this.kinect.closeMultiSourceReader();
        this.kinect.removeAllListeners();

        console.log('kinect device closed');
    }
}

module.exports = Kinect2;