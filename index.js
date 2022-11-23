const flash = require("express-flash");
const session = require("express-session");
const express = require("express");
const exphbs = require("express-handlebars");
const bodyParser = require("body-parser");
const spazaSuggest= require("./spaza-suggest");
const ShortUniqueId = require("short-unique-id");

const pgp = require("pg-promise")();
const app = express();

let useSSL = false;
let local = process.env.LOCAL || false;
if (process.env.DATABASE_URL && !local) {
    useSSL = true;
}

const DATABASE_URL =
process.env.DATABASE_URL ||
"postgresql://postgres:pg123@localhost:5432/spaza_suggest";

const config = {
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
};

const db = pgp(config);

const spaza = spazaSuggest(db);
const uid = new ShortUniqueId({ length: 5 });





app.engine("handlebars", exphbs.engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.use(
  session({
    secret: "using session http",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(flash());
app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", function(req, res){
    res.render("index")
})

//getting code
app.post("/register", async function(req, res){
    let usernames =req.body.OwnersName.charAt(0).toUpperCase() +
    req.body.OwnersName.slice(1).toLowerCase();
  
    if(usernames){
      await spaza.registerClient(usernames)
    }
    const code = uid();
    await spaza.clientLogin(code)
    req.flash("output", "PLEASE SAVE YOUR CODE" + " " + " : " + " " + code);
  

    res.redirect("registered")
})

app.get("/registered", function(req, res){

  res.render("registered")
})

//show page for client login for the client  
app.post("/login", async function(req, res){
let username=
  req.body.uname.charAt(0).toUpperCase() +
  req.body.uname.slice(1).toLowerCase();
const coded = req.body.psw;
let passCode = await spaza.clientLogin(coded);

if (!coded) {
  req.flash("error", "PLEASE CHECK YOUR CODE");
  res.redirect("/client");
}else{
  res.render("/suggest/" + username )
}
// } else if ((username == passCode)) {
//   req.session.passCode = passCode;
//   res.redirect("/suggest/" + username);

// }
  
})

app.get("/suggestClient/ + username", async function (req, res){

  res.render("suggestClient")
})






//showing the page for admin login

app.post("/admin", async function(req, res){
  let username =
      req.body.uname.charAt(0).toUpperCase() +
      req.body.uname.slice(1).toLowerCase();
    const coded = req.body.psw;

    let check = await spaza.registerClient(coded); // return true if admin else return false if is not admin

    if (check) {
      res.redirect("/viewing");
    } else {
      req.flash("error", "PLEASE CHECK YOUR NAME AND YOUR CODE");
    }

  res.redirect("back")
})

app.get("/admin", function(req, res){

  res.render("admin")
})

app.get("/client",function(req, res){

  res.render("client")
})




const PORT = process.env.PORT || 3099;
app.listen(PORT, function () {
  console.log("APP STARTED AT PORT", PORT);
});