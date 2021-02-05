const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");

const session_secret = "newton";

const app = express();
app.use(express.json()); 
app.use(cors({
    credentials: true,
    origin: "http://localhost:3000"
}));
app.use(
  session({
    secret: session_secret,
    cookie: { maxAge: 1*60*60*1000 }
  })
); 
const db = mongoose.createConnection("mongodb://localhost:27017/skyleaf", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  userName: String,
  password: String,
});

const infoSchema = new mongoose.Schema({
  userName: String,
  emailId: String,
  interest: String,
  userId: mongoose.Schema.Types.ObjectId,
  
});

const userModel = db.model("user", userSchema);
const infoModel = db.model("info", infoSchema);


const isNullOrUndefined = (val) => val === null || val === undefined;
const SALT = 5;

app.post("/signup", async (req, res) => {
  const { userName, password } = req.body;
  const existingUser = await userModel.findOne({ userName });
  if (isNullOrUndefined(existingUser)) {
    const hashedPwd = bcrypt.hashSync(password, SALT);
    const newUser = new userModel({ userName, password: hashedPwd });

    await newUser.save();
    req.session.userId = newUser._id;
    res.status(201).send({ success: "Signed up" });
  } else {
    res.status(400).send({
      err: `UserName ${userName} already exists. Please choose another.`,
    });
  }
});

app.post("/login", async (req, res) => {
  const { userName, password } = req.body;
  const existingUser = await userModel.findOne({
    userName,
  });

  if (isNullOrUndefined(existingUser)) {
    res.status(401).send({ err: "UserName does not exist." });
  } else {
    const hashedPwd = existingUser.password;
    if (bcrypt.compareSync(password, hashedPwd)) {
      req.session.userId = existingUser._id;
      console.log('Session saved with', req.session);
      res.status(200).send({ success: "Logged in" });
    } else {
      res.status(401).send({ err: "Password is incorrect." });
    }
  }
});

const AuthMiddleware = async (req, res, next) => {
    console.log('Session', req.session);
  
  if (isNullOrUndefined(req.session) || isNullOrUndefined(req.session.userId) ) {
    res.status(401).send({ err: "Not logged in" });
  } else {
    next();
  }
};

app.get("/info", AuthMiddleware, async (req, res) => {
  const allinfo = await infoModel.find({ userId: req.session.userId });
  res.send(allinfo);
});
app.get("/allinfo", AuthMiddleware, async (req, res) => {
  const allinfo = await infoModel.find();
  res.send(allinfo);
});

app.post("/info", AuthMiddleware, async (req, res) => {
  const info = req.body;
  info.userName = req.body.userName;
  info.emailId = req.body.emailId;
  info.interest = req.body.interest;
  info.userId = req.session.userId;
  info.file = req.body.file;
  const newinfo = new infoModel(info);
  await newinfo.save();
  res.status(201).send(newinfo);
});

app.put("/user/:userid", AuthMiddleware, async (req, res) => {
  const info = req.body;
  const infoId  = req.params.userid;

  try {
    const info = await todoModel.findOne({ _id: infoId, userId: req.session.userId });
    if (isNullOrUndefined(info)) {
      res.sendStatus(404);
    } else {
      info.emailId = req.body.emailId;
     info.interest = req.body.interest;
     info.userId = req.session.userId;
      await info.save();
      res.send(info);
    }
  } catch (e) {
    res.sendStatus(404);
  }
});

app.delete("/user/:userid", AuthMiddleware, async (req, res) => {
  const userid = req.params.userid;

  try {
    await infoModel.deleteOne({ _id:userid , userId: req.session.userId });
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(404);
  }
});

app.get("/logout", (req, res)=> {
    if(!isNullOrUndefined(req.session)) {
        // destroy the session
        req.session.destroy(() => {
            res.sendStatus(200);
        });

    } else {
        res.sendStatus(200);
    }
});

app.get('/userinfo', AuthMiddleware, async (req, res) => {
    const user = await userModel.findById(req.session.userId);
    res.send({ userName : user.userName });
});

app.listen(9999);