import { AppWebSocket } from "./network/webSocket.js";

class Index {
    constructor() {
        this.ws = new AppWebSocket();
    }

    App() {
        this.ws.connect();
        console.log("App is running");
    }
}

const INDEX = new Index();
INDEX.App();