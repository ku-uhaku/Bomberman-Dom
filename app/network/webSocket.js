export class AppWebSocket {
    constructor(url = null) {
        this.url = url;
    }

    getWebSocketURL() {
        if (this.url) {
            return this.url;
        }

        const { protocol, host } = window.location;
        const socketProtocol = protocol === "https:" ? "wss:" : "ws:";
        console.log(`WebSocket URL: ${socketProtocol}//${host}`);
        return `${socketProtocol}//${host}`;
    }

    connect() {
        // Implementation for connecting to the WebSocket server
        this.socket = new window.WebSocket(this.getWebSocketURL());
        // console.log("Connecting to WebSocket server...");   
        return new Promise((resolve, reject) => {
            this.socket.onopen = () => {
                console.log("WebSocket connection established");
                resolve();
            };

            this.socket.onerror = (error) => {
                console.error("WebSocket connection failed", error);
                reject(error);
            };
        });
    }

    sendMessage(message) {}

    disconnect() {}
}