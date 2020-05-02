'use strict';
const rs2 = require('node-librealsense');
const Device = require('../Device');

class RealSense extends Device {
    init(){

        //catch if device not connected

        // this.cameraInfo = new rs2.camera_info;
        // this.ctx = new rs2.Context();
        // this.config = new rs2.Config();


        //
        // if(this.ctx.queryDevices().size > 0){
        //     console.log("Get first device");
        //     this.device = this.ctx.queryDevices().front;
        // }
        //
        // this.config.enableDevice(this.ctx.queryDevices().front.getCameraInfo().serialNumber);

        this.pipeline = new rs2.Pipeline();
        this.colorizer = new rs2.Colorizer();

        this.depthFeed = false;
        this.colorFeed = false;

        console.log("realSense device initialized");

        // this.config = new rs2.Config();
        // this.config.enableStream(0, -1, 0, 0, rs2.format.format_raw8, 0);
        // this.config.resolve(this.pipeline);
    }

    start() {
        console.log("start realsense pipeline");
        this.pipeline.start();

        // this.frameset = new rs2.FrameSet();
        //
        //
        //
        // this.poller = setInterval(() => {
        //     if(this.pipeline.pollForFrames(this.frameset)){
        //         this.getLastFrame();
        //     }
        //
        // }, 100);

        this.poller = setInterval(() => {
            this.getLastFrame();
        }, 100);

        //4 * 1000 / this.expectedFps
    }

    getLastFrame() {
        const resultSet = this.pipeline.pollForFrames();
        if (resultSet) {
           if(this.depthFeed && resultSet.depthFrame){
               let depthFrame = this.colorizer.colorize(resultSet.depthFrame);
               let processedDepth = this.processDepth(depthFrame.data, depthFrame.width, depthFrame.height);
               this.onDepthFrame({data: processedDepth, width: depthFrame.width, height: depthFrame.height, channel: 3});

               // let depthFrame = this.colorizer.colorize(resultSet.depthFrame);
               // this.onDepthFrame({data: depthFrame.data, width: depthFrame.width, height: depthFrame.height, channel: 3});
           }

           if(this.colorFeed && resultSet.colorFrame){
               let colorFrame = resultSet.colorFrame;
               this.onColorFrame({data: colorFrame.data, width: colorFrame.width, height: colorFrame.height, channel: 3});
           }
        }
    }

    getDepth(){
       // this.colorFeed = false;
        this.depthFeed = true;
        console.log('start depth cam');
    }

    getColor(){
        this.colorFeed = true;
      //  this.depthFeed = false;
        console.log('start color cam');
    }

    processDepth(frameData, w, h){
        let processed = [];
        for(let i = 0; i < w * h * 3; i += 3){
            let color = this.RGBtoHSV(frameData[i], frameData[i + 1], frameData[i + 2]);
            // console.log(color);
            let mapped = this.map(color.h, 0, 240 / 360, 0, 255);
            processed[i] = mapped;
            processed[i + 1] = mapped;
            processed[i + 2] = mapped;
        }

        return processed;
    }

    RGBtoHSV(r, g, b) {
        if (arguments.length === 1) {
            g = r.g, b = r.b, r = r.r;
        }
        var max = Math.max(r, g, b), min = Math.min(r, g, b),
            d = max - min,
            h,
            s = (max === 0 ? 0 : d / max),
            v = max / 255;

        switch (max) {
            case min: h = 0; break;
            case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
            case g: h = (b - r) + d * 2; h /= 6 * d; break;
            case b: h = (r - g) + d * 4; h /= 6 * d; break;
        }

        return {
            h: h,
            s: s,
            v: v
        };
    }

    map (value, inputMin, inputMax, outputMin, outputMax){
        return (
            ((value - inputMin) * (outputMax - outputMin)) / (inputMax - inputMin) +
            outputMin
        );
    };

    stop() {
        console.log('device closed');
        this.pipeline.stop();
        this.pipeline.destroy();

        rs2.cleanup();

        clearInterval(this.poller);

        console.log('realSense device closed');
    }
}

module.exports = RealSense;