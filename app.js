const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const url = require("url");
const uuidv4 = require("uuid").v4;

const app = express();
const server = http.createServer(app);
const wsServer = new WebSocket.Server({ server });
const PORT = process.env.PORT || 8000;
const MONGODB_URI = `mongodb+srv://2karinaoist:OistrachK@bether.ledfzng.mongodb.net/?retryWrites=true&w=majority`;
var numOfClients = 0;
app.use(cors());
const connections = {};
const users = {};
const admins = [];
let isAdmin = false;

const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

admins.length = 4;
admins.fill(0);

// endpoints
app.get("/", (req, res) => {
  res.send("Hello World! This is an Express server with WebSocket.");
});

app.get("/codeblocks", async (req, res) => {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    // Access my specific collection
    const db = client.db("BeTher");
    const items = await db.collection("CodeBlocks").find({}).toArray();

    //response
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(items)); // Send code blocks as a JSON response
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
});

app.get("/numOfClients", (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(numOfClients));
});

// webSocket server

const broadcast = () => {
  Object.keys(connections).forEach((uuid) => {
    const connection = connections[uuid];
    const message = JSON.stringify(users);
    connection.send(message);
  });
};

const handleMessage = (bytes, uuid) => {
  const message = JSON.parse(bytes.toString());
  users[uuid].state = message;
  const user = users[uuid];
  broadcast();
  //   console.log(
  //     `${user.username} updated their updated state: ${JSON.stringify(
  //       user.state
  //     )}`
  //   );
};

const handleClose = (uuid) => {
  console.log(`${users[uuid].username} disconnected`);
  delete connections[uuid];
  delete users[uuid];
  broadcast();
};

wsServer.on("connection", (connection, request) => {
  console.log(admins);
  const { roomid } = url.parse(request.url, true).query;
  console.log(roomid);
  console.log(`${roomid} connected`);
  if (admins[roomid - 1] === 0) {
    admins[roomid - 1] = 1;
    isAdmin = true;
  } else {
    isAdmin = false;
  }
  console.log(admins);
  console.log(isAdmin);
  const uuid = uuidv4();
  connections[uuid] = connection;
  users[uuid] = {
    isAdmin: isAdmin,
    state: {},
  };
  console.log(users[uuid]);
  const message = JSON.stringify(users[uuid]);
  connection.send(message);
  console.log(message);
  //broadcast();

  connection.on("message", (message) => handleMessage(message, uuid));
  connection.on("close", () => handleClose(uuid));
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
