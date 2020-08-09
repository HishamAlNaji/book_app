const express = require("express");
const app = express();

require("dotenv").config();
const cors = require("cors");

app.set("view engine", "ejs")

app.use(cors());

app.use(express.static('public'))

// main
app.get("/hello", (req, res) => {
    res.status(200).render("pages/index");
});

// page not found middleware
app.all("*", (req, res) => {
    res.status(404).send({ msg: "Sorry, page not found !" });
})

/*
// error middleware
app.use((err, req, res, next) => { // eslint-disable-line
  res.status(500).send({ msg: "Sorry, something went wrong !" });
});
*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
    console.log(`listening on ${PORT}`)
);