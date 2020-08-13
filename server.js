"use strict";

// Decalaring varaibles
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pg = require("pg");

//create connection to database
var db = new pg.Client(process.env.DATABASE_URL);

// initialize the server
const app = express();

// Use cros
app.use(cors());

// Use super agent
const superagent = require("superagent");

// Declare a port
const PORT = process.env.PORT || 3000;

// Test the server
db.connect().then(() => {
    app.listen(PORT, () => {
        console.log("I am listening to port: ", PORT);
    });
});

// view engine setup
app.set("view engine", "ejs");

//setup public folder
app.use(express.static("./public"));

//set the encode for post body request
app.use(express.urlencoded({ extended: true }));

// Home route
app.get("/", async(req, res) => {
    let result = await getBooksDB();
    res.render("pages/index", {
        books: result.books,
        booksCount: result.booksCount
    });

});

// New search route
app.get("/searches/new", (req, res) => {
    res.render("./searches/new.ejs");
});


//Handle sreach request
app.post("/searches", async(req, res) => {
    let searchInput = req.body.searchInput;
    let searchType = req.body.searchType;
    let result = await getBooks(searchInput, searchType);
    if (result.status === 200) {
        // res.send(result.booksList);
        res.render('./searches/show', {
            books: result.booksList,
        });
    } else {
        res.render('./pages/error', {
            error: result,
        });
    }
});

// fucntion to get books from google book api
function getBooks(searchInput, searchType) {
    let url = "https://www.googleapis.com/books/v1/volumes";
    let queryParams = {
        q: `in${searchType}:${searchInput}`,
    };
    let result = superagent
        .get(url)
        .query(queryParams)
        .then((res) => {
            console.log(res.body.items);
            let booksList = res.body.items.map((e) => {
                return new Book(e);
            });
            return {
                status: res.status,
                booksList: booksList,
            };
        })
        .catch((error) => {
            return {
                status: error.status,
                message: error.response.text,
            };
        });
    return result;
}


// Get books from database
function getBooksDB() {
    let sql = "SELECT * FROM books";
    return db
        .query(sql)
        .then((result) => {
            console.log(result.rows);
            return {
                books: result.rows,
                booksCount: result.rowCount
            }
        })
        .catch((error) => {
            console.log(error);
        });
}

// creating book constructor
function Book(data) {
    this.image_url =
        data.volumeInfo.imageLinks.thumbnail || "https://i.imgur.com/J5LVHEL.jpg";
    this.title = data.volumeInfo.title;
    this.author = data.volumeInfo.authors;
    this.description = data.volumeInfo.description || "There is no description";
    this.isbn =
        (data.volumeInfo.industryIdentifiers &&
            data.volumeInfo.industryIdentifiers[0].type +
            " " +
            data.volumeInfo.industryIdentifiers[0].identifier) ||
        "There is no isbn ";
}