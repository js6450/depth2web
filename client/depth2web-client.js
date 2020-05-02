import Peer from "./peerjs"

class Depth2Web{

    constructor(addr, port = 8000){
        this.imgWidth = 320;
        this.imgHeight = 240;

        this.devices = [];
        this.device_elems = [];
        this.show_elems = false;

        this.depthElems = [];
        this.colorElems = [];

        this.depthData = [];
        this.colorData = [];

        this.peer_net = {host: "localhost", port: 8000, path: "/"};
        this.peer_id = "depth2web";
        this.connection = null;

        if(addr){
            this.peer_net.host = addr;
        }

        this.peer = new Peer(this.peer_net);

        this.peer.on("open", function(id){
            console.log("open connection with peer id: ", id);
            this.connect();
        }.bind(this));

        this.peer.on("connection", function(conn){
            conn.on("open", function(){
                console.log("connected to peer server");
            })
        });

    }

    connect(){
        this.connection = this.peer.connect(this.peer_id);

        this.connection.on("open", function(data){
            console.log("open data connection with peer server");
        });

        this.connection.on("data", function(sent){

            if(sent.event === "close-all"){
                this.devices = [];

                for(i = 0; i < this.device_elems.length; i++){
                    let toErase = this.device_elems[i];
                    toErase.parentNode.removeChild(toErase);
                }

                this.device_elems = [];

                this.depthElems = [];
                this.colorElems = [];

                this.depthData = [];
                this.colorData = [];
            }

            let devicename = sent.device + "-" + sent.id;

            let device_index = this.devices.indexOf(devicename);

            if(sent.event === "device-closed"){

                console.log(devicename + " closed");

                this.devices.splice(device_index);
                let toErase = this.device_elems[device_index];

                for(let i = 0; i < this.colorElems; i++){
                    if(this.colorElems[i][0] === devicename){
                        this.colorElems.splice(i, 1);
                    }
                }

                for(let i = 0; i < this.depthElems; i++){
                    if(this.depthElems[i][0] === devicename){
                        this.depthElems.splice(i, 1);
                    }
                }

                toErase.parentNode.removeChild(toErase);
                this.device_elems.splice(device_index);
            }else{
                if(device_index < 0){
                    this.devices.push(devicename);

                    let div = document.createElement('div');
                    div.id = devicename;
                    div.style.display = "none";
                    let depth_img_elem = document.createElement('img');
                    depth_img_elem.id = devicename + "-depth";
                    let color_img_elem = document.createElement('img');
                    color_img_elem.id = devicename + "-color";

                    div.append(color_img_elem);
                    div.append(depth_img_elem);
                    document.body.append(div);

                    this.device_elems.push(div);
                }else{

                    if(this.show_elems){
                        for(let i = 0; i < this.device_elems.length; i++){
                            if(this.device_elems[i].style.display === "none"){
                                this.device_elems[i].style.display = "block";
                            }
                        }
                    }

                    if(sent.event === "depth"){
                        if(sent.data === "stop"){
                            console.log("remove");
                            this.device_elems[device_index].children[1].removeAttribute("src");
                        }else{
                            let newBlob = new Blob([sent.data], {type: 'image/webp'});
                            let newURL = URL.createObjectURL(newBlob);

                            this.depthData[device_index] = new Uint8Array(sent.data);
                            this.device_elems[device_index].children[1].src = newURL;

                            this.depthElems[device_index] = [devicename, newURL];
                        }
                    }

                    if(sent.event === "color"){
                        if(sent.data === "stop"){
                            console.log("remove");
                            this.device_elems[device_index].children[0].removeAttribute("src");
                        }else{
                            let newBlob = new Blob([sent.data], {type: 'image/webp'});
                            let newURL = URL.createObjectURL(newBlob);

                            this.colorData[device_index] = new Uint8Array(sent.data);
                            this.device_elems[device_index].children[0].src = newURL;

                            if(sent.device === "azure"){
                                this.device_elems[device_index].children[0].filter = "hue-rotate(150deg)"
                            }

                            this.colorElems[device_index] = [devicename, newURL];
                        }
                    }
                }
            }
        }.bind(this));
    }

    deviceCount(){
        return this.devices.length;
    }

    depthCount(){
        return this.depthElems.length;
    }

    colorCount(){
        return this.colorElems.length;
    }

    getDepth(i){
        return this.depthElems[i][1];
    }

    getDepthData(i){
        return this.depthData[i];
    }

    getColor(i){
        return this.colorElems[i][1];
    }

    getColorData(i){
        return this.colorData[i];
    }

}

window.Depth2Web = Depth2Web;