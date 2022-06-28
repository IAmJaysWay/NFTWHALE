const express = require("express");
const cors = require("cors");
const moonbirds = require("./moonbirdsOwners");
const moonbirdsH = require("./moonbirdsHistory");

const collections = {
    "0x23581767a106ae21c074b2276D25e5C3e136a68b":{
        owners: moonbirds,
        history: moonbirdsH
      },
}

const app = express();

const port = 4000;

app.use(cors());


app.get("/", (req, res) => {
  res.send("Welcome to the Whale NFT server");
});

app.get("/collection", (req, res) => {
    const slug = req.query.slug;
    res.send(collections[slug].owners);
});

app.get("/user", (req, res) => {
    const slug = req.query.slug;
    const address = req.query.address;
    res.send(collections[slug].history[address]);
  });


app.listen(port, () =>
  console.log(`Whale NFT server running on ${port}`)
);