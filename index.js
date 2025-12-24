const express = require("express");
const app = express();
const cors = require("cors");

const userAuthRoutes = require("./routes/userAuthRoutes");


app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/user", userAuthRoutes);
