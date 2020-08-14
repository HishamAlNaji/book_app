"use strict";

// Decalaring varaibles
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pg = require("pg");
var methodOverride = require("method-override");

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

// Home route
app.get("/", handleHome);

// New search route
app.get("/searches/new", handleNew);

//Handle sreach request
app.post("/searches", handleSearches);

// Handle book details request
app.get("/books/:id", handleBookDetails);

// Handle book edit
app.put("/books/:id", handleBookEdit);

// Handle book delete
app.delete("/books/:id", handleBookDelete);

// Handle save book to database request
app.post("/books/", handleSaveBook);

//******************************* Handling Routes *******************************//
// Home
async function handleHome(req, res) {
    let result = await getBooksDB();
    res.render("pages/index", {
        books: result.books,
        booksCount: result.booksCount,
    });
}

//Searches new form route
function handleNew(req, res) {
    res.render("./searches/new");
}

//Searches result
async function handleSearches(req, res) {
    let searchInput = req.body.searchInput;
    let searchType = req.body.searchType;
    let result = await getBooks(searchInput, searchType);
    if (result.status === 200) {
        res.render("./searches/show", {
            books: result.booksList,
        });
    } else {
        res.render("pages/error", {
            error: result,
        });
    }
}

// Search book details
async function handleBookDetails(req, res) {
    let id = req.params.id;
    let book = await getBookByID(id);
    let bookshelfs = await getBookshelfs();
    res.render("pages/books/show", {
        book: book,
        bookshelfs: bookshelfs,
    });
}

// save book route
async function handleSaveBook(req, res) {
    let book = req.body;
    let lastID = await saveBook(book);
    res.redirect(`/books/${lastID}`);
}

//Edit book
async function handleBookEdit(req, res) {
    let book = req.body;
    let id = req.params.id;
    await updateBook(id, book);
    res.redirect(`/books/${id}`);
}

//Delete book
async function handleBookDelete(req, res) {
    let id = req.params.id;
    await deleteBook(id);
    res.redirect("/");
}

//******************************* functions *******************************//

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
            // console.log(res.body.items);
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
            return {
                books: result.rows,
                booksCount: result.rowCount,
            };
        })
        .catch((error) => {
            console.log(error);
        });
}

// Get book by ID from database
function getBookByID(id) {
    let sql = `SELECT * FROM books WHERE id=$1;`;
    let values = [id];
    return db
        .query(sql, values)
        .then((result) => {
            // console.log(result);
            return result.rows[0];
        })
        .catch((error) => {
            console.log(error);
        });
}

// save book to database
function saveBook(book) {
    let sql = `INSERT INTO books (author, title, isbn, image_url, description, bookshelf) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`;
    let values = [
        book.author,
        book.title,
        book.isbn,
        book.image_url,
        book.description,
        book.bookshelf,
    ];
    return db
        .query(sql, values)
        .then((res) => {
            // console.log(res);
            return res.rows[0].id;
        })
        .catch((error) => {
            console.log("error", error);
        });
}

// get all bookshilfs in thae database
function getBookshelfs() {
    let sql = "SELECT DISTINCT bookshelf FROM books";
    return db
        .query(sql)
        .then((res) => {
            return res.rows;
        })
        .catch((error) => {
            console.log("error", error);
        });
}

// function to update book in the database
function updateBook(id, book) {
    let sql =
        "UPDATE books SET author = $1, title = $2, isbn= $3, image_url =$4, description =$5, bookshelf=$6 WHERE id = $7;";
    let values = [
        book.author,
        book.title,
        book.isbn,
        book.image_url,
        book.description,
        book.bookshelf,
        id,
    ];

    return db
        .query(sql, values)
        .then((res) => {
            console.log(res);
            // return res.rows[0].id;
        })
        .catch((error) => {
            console.log("error", error);
        });
}

//function to delete a book from database
function deleteBook(id) {
    let sql = 'DELETE FROM books WHERE id=$1';
    let values = [id];
    return db
        .query(sql, values)
        .then((res) => {
            // console.log(res);
        })
        .catch((error) => {
            console.log("error", error);
        });

}
// ******************* Book Constructor ****************** //
// creating book constructor
function Book(data) {
    this.image_url =
        (data.volumeInfo.imageLinks && data.volumeInfo.imageLinks.thumbnail) ||
        "https://i.imgur.com/J5LVHEL.jpg";
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