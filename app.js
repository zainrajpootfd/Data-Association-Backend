const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const upload = require("./config/multerconfig");

// app.get("/create", async function (req, res) {

//   let user = await userModel.create({
//     username: "John Doe",
//     email: "johndoe@example.com",
//     age: 30,
//   });
//   res.send(user);
// });
// app.get("/post/create", async function (req, res) {
//   let post = await postModel.create({
//     postdata: "Hello World!",
//     user: "66fd176c4feddad6e522f373",
//   });
//   let user = await userModel.findOne({ _id: "66fd176c4feddad6e522f373" });
//   user.posts.push(post._id);
//   await user.save();
//   res.send({ post, user });
// });
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "./public/images/uploads");
//   },
//   filename: function (req, file, cb) {
//     crypto.randomBytes(12, function (err, bytes) {
//       const fn = bytes.toString("hex") + path.extname(file.originalname);
//       cb(null, fn);
//     });
//   },
// });

// const upload = multer({ storage: storage });

app.get("/", function (req, res) {
  res.render("index");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/profile/upload", function (req, res) {
  res.render("profileupload");
});
app.post(
  "/upload",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    let user = await userModel.findOne({ email: req.user.email });
    //now rename filename of profile pic set in user model

    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
  }
);

app.get("/profile", isLoggedIn, async function (req, res) {
  let user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts");
  console.log(user);
  res.render("profile", { user });
});
app.get("/like/:id", isLoggedIn, async function (req, res) {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");

  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }

  await post.save();

  res.redirect("/profile");
});
app.get("/edit/:id", isLoggedIn, async function (req, res) {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");

  res.render("edit", { post });
});

app.post("/update/:id", isLoggedIn, async function (req, res) {
  let post = await postModel.findOneAndUpdate(
    { _id: req.params.id },
    { content: req.body.content }
  );

  res.redirect("/profile");
});

app.post("/post", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;

  let post = await postModel.create({
    user: user._id,
    content,
  });
  user.posts.push(post._id);
  await user.save();
  // console.log(post);
  res.redirect("/profile");
});

app.post("/register", async function (req, res) {
  let { name, username, password, email, age } = req.body;

  let user = await userModel.findOne({ email });
  if (user) return res.status(400).send("user already registered");

  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
      let user = await userModel.create({
        name,
        username,
        password: hash,
        email,
        age,
      });
      let token = jwt.sign({ email: email, userid: user._id }, "sssssss");
      res.cookie("token", token);
      res.send("user registered sucessfully");
    });
  });
});

app.post("/login", async function (req, res) {
  let { password, email } = req.body;

  let user = await userModel.findOne({ email });
  if (!user) return res.status(400).send("something went wrong");

  bcrypt.compare(password, user.password, function (err, result) {
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, "sssssss");
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else res.redirect("/login");
  });
});

app.get("/logout", function (req, res) {
  res.cookie("token", "");
  res.redirect("/login");
});

function isLoggedIn(req, res, next) {
  if (req.cookies.token === "") res.redirect("/login");
  else {
    let data = jwt.verify(req.cookies.token, "sssssss");
    req.user = data;
    next();
  }
}

app.listen(3000, function () {
  console.log("Server is running on port 3000");
});
