import express from "express";
import http from "http";
import WebSocket from "ws";
import { AddressInfo } from "net";

interface Device {
  id: string;
  type: string;
  name: string;
}

interface InitBody {
  type: string;
  device: Device;
}

let websocketHashMap = new Map<string, WebSocket>();

// 构建websocket服务器
const webSocketApp = express();
const webScoketServer = http.createServer(webSocketApp);
const wss = new WebSocket.Server({ server: webScoketServer });

wss.on("connection", (ws: WebSocket) => {
  let id = "";

  ws.on("message", (message: string) => {
    console.log("received: %s", message);
    let initBody: InitBody = JSON.parse(message);
    if (initBody.type == "init") {
      id = initBody.device.id;
      websocketHashMap.set(initBody.device.id, ws);
    }
  });

  ws.on("error", (err: Error) => {
    if (id != "") {
      websocketHashMap.delete(id);
    }
    console.log(err);
  });

  ws.on("close", (code: number, reason: Buffer) => {
    if (id != "") {
      websocketHashMap.delete(id);
    }
    console.log(code + ": " + reason);
  });
});

// start our websocket server
webScoketServer.listen(8687, () => {
  console.log(
    `Websocket Server started on port ${
      (webScoketServer.address() as AddressInfo).port
    }`
  );
});

// 构建Http服务器
const httpServerApp = express();
httpServerApp.use(express.json());

httpServerApp.post("/addmessage", (req, res) => {
  let params = req.body;
  console.log(`body: ${params}`);
  let result = { code: 200, msg: "good", data: -1 };
  try {
    let n = 0;
    for (let id of params.ids) {
      console.log(id);
      const clipboard = { type: "text", data: params.data, date: "114514" };
      if (websocketHashMap.has(id)) {
        let ws = websocketHashMap.get(id);
        ws?.send(JSON.stringify(clipboard));
        n++;
      }
    }
    result.data = n;
  } catch (e) {
    result.code = 404;
    console.log("Error: ", e);
    result.msg = "error";
  }
  res.send(result);
});

httpServerApp.listen(8685, "127.0.0.1", () => {
  console.log("http Server start at 8685");
});
