const sharp = require('sharp');

module.exports = class Device {
    constructor(id, type){
        this.id = id;
        this.type = type;
        this.init();
        this.onImage = () => {};
        this.onError = () => {};

        this.w = 320;
        this.h = 240
    }

    init() {
        this.timer = null;
    }

    start() {
        //initalize device
        this.timer = setInterval(() => {
            this.sendFrame();
        }, 100);
    }

    setSize(_w, _h){
        this.w = _w;
        this.h = _h;
    }

    stop() {
        clearTimeout(this.timer);
        console.log('stopping device');
    }

    onColorFrame({data, width, height, channel}){
        sharp(Buffer.from(data), {raw: {width, height, channels: channel}})
            .resize(this.w, this.h)
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
            .resize(this.w, this.h)
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