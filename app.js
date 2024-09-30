const cookieParser = require("cookie-parser");
const express = require("express");
const userModel = require("./models/user");
const postModel = require("./models/post");
const path = require("path");
const bcrypt = require("bcrypt"); //For encryption of passwords
const jwt = require("jsonwebtoken");
const { render } = require("ejs");
// const multer = require("multer");
const crypto = require("crypto");
const multerUpload = require("./config/multerConfig");



const app = express();
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, './public/images/uploads');
//   },
//   filename: function (req, file, cb) {
//     crypto.randomBytes(12, (err, bytes) => {
//       const fn = bytes.toString("hex") + path.extname(file.originalname);
//       cb(null, fn);
//     });
//   }
// });

// const upload = multer({ storage: storage })

app.get("/", (req, res) => {
  if(req.cookies.token == null) return res.redirect("/login");
  else{
    res.redirect("/media");
  }
});

app.get("/register", (req, res) => {
  res.render("index");
});

app.post("/register", async (req, res) => {
  const {usernameInput, passwordInput, nameInput, emailInput, ageInput} = req.body;

  let user = await userModel.findOne({email: emailInput});
  if(user) return res.send("User already registered");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(passwordInput, salt, async (err, hash) => {
      user = await userModel.create({
        username: usernameInput,
        password: hash,
        name: nameInput,
        email: emailInput,
        age: ageInput,
      });

      let token = jwt.sign({email: emailInput, userId: user._id}, "secretencrypt") //This string is actural encrypter . Currently we are simply mentioning this secrect encrypter like this
      res.cookie("token", token, {maxAge: 24 * 60 * 60 * 1000});
      return res.redirect("/login");
    }); 
  });
});

app.get("/profile", isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({_id: req.signData.userId}).populate("posts");
  res.render("profile", {user});
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const {usernameInput, passwordInput} = req.body;

  const user = await userModel.findOne({username: usernameInput});
  if(!user) return res.status(500).send("Something went wrong");
  else{
    bcrypt.compare(passwordInput, user.password, function(err, result) {
      if(result){
        const token = jwt.sign({email: user.email, userId: user._id}, "secretencrypt");
        res.cookie("token", token, {maxAge: 24 * 60 * 60 * 1000});
        res.redirect("/profile");
      }
      else{
        res.send("Something went wrong");
      }
    });
  }
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
}); 

app.post("/post", isLoggedIn, async (req, res) => {
  const {postInput} = req.body;
  const user = await userModel.findOne({_id: req.signData.userId});
  const post = await postModel.create({
    user: req.signData.userId,
    content: postInput
  });
  user.posts.push(post._id);
  user.save();
  res.redirect("/profile");
});

app.get("/like/add/:postId", isLoggedIn, async (req, res) => {
  const post = await postModel.findOne({_id: req.params.postId});
  if (!post.likes.includes(req.signData.userId)) {
    post.likes.push(req.signData.userId);
    await post.save();
  }
  res.redirect("/media");
});

app.get("/like/remove/:postId", isLoggedIn, async (req, res) => {
  const post = await postModel.findOne({_id: req.params.postId});
  const index = post.likes.indexOf(req.signData.userId);
  if (index !== -1) {
    post.likes.splice(index, 1);
  }
  await post.save();
  res.redirect("/media");
});

app.get("/like/profile/add/:postId", isLoggedIn, async (req, res) => {
  const post = await postModel.findOne({_id: req.params.postId});
  if (!post.likes.includes(req.signData.userId)) {
    post.likes.push(req.signData.userId);
    await post.save();
  }
  res.redirect("/profile");
});

app.get("/like/profile/remove/:postId", isLoggedIn, async (req, res) => {
  const post = await postModel.findOne({_id: req.params.postId});
  const index = post.likes.indexOf(req.signData.userId);
  if (index !== -1) {
    post.likes.splice(index, 1);
  }
  await post.save();
  res.redirect("/profile");
});


app.get("/edit/:postId", async (req, res) => {
  const post = await postModel.findOne({_id: req.params.postId});
  res.render("editPost", {postId: req.params.postId, post});
}); 

app.post("/edit/:postId", async (req, res) => {
  const {postInput} = req.body;
  const post = await postModel.findOneAndUpdate({_id: req.params.postId}, {content: req.body.postInput});
  res.redirect("/profile");
}); 

app.get("/profileImg/upload", isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({_id: req.signData.userId});
  res.render("profileImgUpload", {user});
});

app.post("/profileImg/upload", isLoggedIn, multerUpload.single("profileImageInput"), async (req, res) => {
  const user = await userModel.findOne({_id: req.signData.userId});
  user.profileImg = {
    filename: req.file.originalname,
    contentType: req.file.mimetype,
    data: req.file.buffer
  };
  await user.save();
  res.redirect("/profile");
});

app.get("/profileImg/:userId", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findOne({_id: req.params.userId});
    if(!user || !user.profileImg.data){
      return res.status(404).send("Image not found!");
    }
    else{
      res.set("Content-Type", user.profileImg.contentType);
      res.send(user.profileImg.data);
    }
  } catch (err) {
    res.status(500).send("Error retrieving image");
  }
});

app.get("/media", isLoggedIn, async (req, res) => {
  const loggedInUser = await userModel.findOne({_id: req.signData.userId});
  const allUsers = await userModel.find({}).populate("posts");
  const allPosts = await postModel.find({}).populate("user");
  res.render("media", { allUsers, allPosts, loggedInUser});
});

function isLoggedIn(req, res, next) {
  if(req.cookies.token === "") return res.send("You need to login first");
  else{
    const signData = jwt.verify(req.cookies.token, "secretencrypt");
    req.signData = signData;
    next();
  }
}

app.listen(3000);
