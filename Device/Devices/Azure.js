'use strict';

const Device = require('../Device');
let KinectAzure = require('kinect-azure');

let COLORWIDTH = 1280;
let COLORHEIGHT = 720;
let DEPTHWIDTH = 640;
let DEPTHHEIGHT = 576;

let busy = false;
class Azure extends Device{
    init(){
        this.kinect = new KinectAzure();
        this.depthFeed = false;
        this.colorFeed = false;
        this.depthModeRange = this.kinect.getDepthModeRange(KinectAzure.K4A_DEPTH_MODE_NFOV_UNBINNED);

        this.colorpix = [];
        this.depthpix = [];

        console.log("azure device initialized");
    }

    start(){
        if(this.kinect.open()){
            this.kinect.startCameras({
                color_format: KinectAzure.K4A_IMAGE_FORMAT_COLOR_BGRA32,
                depth_mode: KinectAzure.K4A_DEPTH_MODE_NFOV_UNBINNED,
                color_resolution: KinectAzure.K4A_COLOR_RESOLUTION_720P,
                camera_fps: KinectAzure.K4A_FRAMES_PER_SECOND_15
            });

            this.kinect.startListening((data) => {
                this.depthpix = data.depthImageFrame.imageData;
                this.colorpix = data.colorImageFrame.imageData;

                if(this.colorFeed){
                    this.onColorFrame({data: this.colorpix, width: COLORWIDTH, height: COLORHEIGHT, channel: 4});
                }

                if(this.depthFeed){
                    this.onDepthFrame({data: this.getDepth(), width: DEPTHWIDTH, height: DEPTHHEIGHT, channel: 4});
                }
            });
        }
    }

    getDepth(){
        if(!this.depthFeed){
            this.depthFeed = true;
        }

        let depthPixelIndex = 0;
        let imageDataArray = [];
        let imagesize = DEPTHWIDTH * DEPTHHEIGHT * 4;

        for (let i = 0; i < imagesize; i += 4) {
            const depthValue = (this.depthpix[depthPixelIndex + 1] << 8) | this.depthpix[depthPixelIndex];

            const normalizedValue = this.map(
                depthValue,
                this.depthModeRange.min,
                this.depthModeRange.max,
                255,
                0
            );
            imageDataArray[i] = normalizedValue;
            imageDataArray[i + 1] = normalizedValue;
            imageDataArray[i + 2] = normalizedValue;
            imageDataArray[i + 3] = 0xff;

            depthPixelIndex += 2;
        }

        return imageDataArray;
    }

    map (value, inputMin, inputMax, outputMin, outputMax){
        return (
            ((value - inputMin) * (outputMax - outputMin)) / (inputMax - inputMin) +
            outputMin
        );
    };

    getColor(){
        if(!this.colorFeed){
            this.colorFeed = true;
        }
        //
        // let imagesize = COLORWIDTH * COLORHEIGHT * 4;
        // let imageDataArray = [];
        //
        // for (let i = 0; i < imagesize; i += 4) {
        //     imageDataArray[i] = this.colorpix[i];
        //     imageDataArray[i + 1] = this.colorpix[i + 1];
        //     imageDataArray[i + 2] = this.colorpix[i + 2];
        //     imageDataArray[i + 3] = 0xff;
        // }
        //
        // console.log("imagedata: " + imageDataArray.length);
        //
        // return imageDataArray
    }

    stop(){
        this.kinect.stopCameras();
        this.kinect.stopListening();
        console.log('kinect device closed');
    }
}

module.exports = Azure;