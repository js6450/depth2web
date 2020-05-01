const sharp = require('sharp');

module.exports = class Device {
    constructor(id, type){
        this.id = id;
        this.type = type;
        this.init();
        this.onImage = () => {};
        this.onError = () => {};
    }

    init() {
        this.timer = null;
    }

    start() {
        //initalize device
        this.timer = setInterval(() => {
            this.sendFrame();
        }, 1000);
    }

    stop() {
        clearTimeout(this.timer);
        console.log('stopping device');
    }

    onColorFrame({data, width, height, channel}){
        sharp(Buffer.from(data), {raw: {width, height, channels: channel}})
            .resize(320, 240)
            //.resize(640, 480)
            .flop()
            .webp()
            .toBuffer()
            .then((img) => {
                this.onImage(img, "color");
            }).catch(function(err){
            console.log(err);
        });
    }

    onDepthFrame({data, width, height, channel}){

       // console.log('render');
        sharp(Buffer.from(data), {raw: {width, height, channels: channel}})
            .resize(320, 240)
            //.resize(640, 480)
            .flop()
            .webp()
            .toBuffer()
            .then((img) => {
                this.onImage(img, "depth");
            }).catch(function(err){
            console.log(err);
        });
    }

    onError(err){
        return err;
    }
};