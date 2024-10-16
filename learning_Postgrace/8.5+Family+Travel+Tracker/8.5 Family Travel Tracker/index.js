import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "0000",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [];

async function checkVisited() {
  try {
    const result = await db.query(
      "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1;",
      [currentUserId]
    );
    let countries = [];
    result.rows.forEach((country) => {
      countries.push(country.country_code);
    });
    return countries;
  } catch (err) {
    console.error("Error querying visited countries:", err);
    return [];
  }
}

async function getCurrentUser() {
  try {
    const result = await db.query("SELECT * FROM users");
    users = result.rows;
    return users.find((user) => user.id == currentUserId);
  } catch (err) {
    console.error("Error querying current user:", err);
    return null;
  }
}

app.get("/", async (req, res) => {
  try {
    const countries = await checkVisited();
    const currentUser = await getCurrentUser();
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser ? currentUser.color : "default",
    });
  } catch (err) {
    console.error("Error rendering home page:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  console.log("Received input:", input);

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    if (result.rows.length > 0) {
      const data = result.rows[0];
      const countryCode = data.country_code;
      console.log("Country code found:", countryCode);

      try {
        await db.query(
          "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
          [countryCode, currentUserId]
        );
        console.log("Country added successfully");
        res.redirect("/");
      } catch (err) {
        console.error("Error inserting new country:", err);
        const countries = await checkVisited();
        res.render("index.ejs", {
          countries: countries,
          total: countries.length,
          error: "Error inserting new country, try again.",
        });
      }
    } else {
      console.log("Country not found in the database");
      const countries = await checkVisited();
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        error: "Country name does not exist, try again.",
      });
    }
  } catch (err) {
    console.error("Error querying country:", err);
    const countries = await checkVisited();
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      error: "Error querying country, try again.",
    });
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
      [name, color]
    );

    const id = result.rows[0].id;
    currentUserId = id;

    res.redirect("/");
  } catch (err) {
    console.error("Error creating new user:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
