const { MongoClient, ServerApiVersion } = require("mongodb");

const MONGODB_URI = `mongodb+srv://2karinaoist:OistrachK@bether.ledfzng.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const fetchCodeBlocksFromDb = async () => {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB");
    const db = client.db("BeTher");
    const codeblocks = await db.collection("CodeBlocks").find({}).toArray();
    return {
      codeblocks: codeblocks,
      errorMessage: null,
    };
  } catch (error) {
    errorMessage = error.message;
    console.log(errorMessage);
    return {
      codeblocks: null,
      errorMessage: errorMessage,
    };
  } finally {
    await client.close();
  }
};

module.exports = {
  fetchCodeBlocksFromDb,
};
