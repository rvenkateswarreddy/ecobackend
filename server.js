const express = require("express");
const dotEnv = require("dotenv");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = express();
const port = process.env.PORT || 4000;
const registerDetails = require("./registermodel");
const middleware = require("./middleware");
const cors = require("cors");
const fs = require("fs");

dotEnv.config();
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  });

app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
  return res.send("Hello World");
});

app.post("/register", async (req, res) => {
  try {
    const {
      fullname,
      email,
      mobile,
      password,
      confirmpassword,
      usertype,
      secretkey,
    } = req.body;

    if (
      !fullname ||
      !email ||
      !mobile ||
      !password ||
      !confirmpassword ||
      !usertype
    ) {
      return res.status(400).send("All fields are required");
    }

    const existingUser = await registerDetails.findOne({ email });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    if (usertype === "admin") {
      if (secretkey !== "ecotrack") {
        return res
          .status(400)
          .send("Invalid secret key for admin registration");
      }

      // Admin registration logic
      const hashedPassword = await bcrypt.hash(password, 10);

      const newAdmin = new registerDetails({
        usertype,
        secretkey,
        fullname,
        email,
        mobile,
        password: hashedPassword,
        confirmpassword: hashedPassword,

        // Add any other admin-specific fields here
      });

      await newAdmin.save();
    } else if (usertype === "user") {
      // User registration logic
      if (password !== confirmpassword) {
        return res.status(400).send("Passwords do not match");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new registerDetails({
        usertype,
        fullname,
        email,
        mobile,
        password: hashedPassword,
        confirmpassword: hashedPassword,

        // Add any other user-specific fields here
      });

      await newUser.save();
    } else {
      return res.status(400).send("Invalid usertype");
    }

    return res.status(200).send("User registered successfully");
  } catch (error) {
    console.error("Server error:", error.message);
    return res.status(500).send("Server error: " + error.message);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await registerDetails.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const payload = {
      user: {
        id: user.id,
        usertype: user.usertype,
      },
    };

    const secret = process.env.JWT_SECRET || "defaultSecret";
    const expiresIn = 36000000;

    jwt.sign(payload, secret, { expiresIn }, (err, token) => {
      if (err) {
        console.error("Error generating token:", err);
        return res.status(500).json({ error: "Server error" });
      }

      // Include usertype in the response
      return res.json({ token, usertype: user.usertype });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/allprofiles", middleware, async (req, res) => {
  try {
    const data = await registerDetails.find();
    return res.status(200).json({ data });
  } catch (error) {
    console.log("error is", error);
  }
});
app.get("/allprofiles/:regNo", async (req, res) => {
  try {
    const regNo = req.params.regNo; // Accessing the value of 'regNo' route parameter

    // Use the 'regNo' value to search for the user in the database
    const user = await registerDetails.findOne({ admissionNumber: regNo });

    // If user is not found, return a 404 error
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If user is found, return the user details
    return res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/myprofile", middleware, async (req, res) => {
  try {
    const mydata = await registerDetails.findById(req.user.id);
    return res.status(200).json({ mydata });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Routes

const treesData = JSON.parse(fs.readFileSync("./Data/trees.json"));
const fuelData = JSON.parse(fs.readFileSync("./Data/fuel.json"));
const perCapitaData = JSON.parse(fs.readFileSync("./Data/percapita.json"));

// Routes for trees data
app.get("/api/trees", (req, res) => {
  res.json(treesData);
});

app.get("/api/trees/:treeName", (req, res) => {
  const treeName = req.params.treeName;
  const tree = treesData.treeData[treeName];
  if (tree) {
    res.json({ [treeName]: tree });
  } else {
    res.status(404).json({ message: "Tree not found" });
  }
});

// Routes for fuel data
app.get("/api/fuel", (req, res) => {
  res.json(fuelData);
});

app.get("/api/fuel/:fuelName", (req, res) => {
  const fuelName = req.params.fuelName;
  const fuel = fuelData[fuelName];
  if (fuel) {
    res.json({ [fuelName]: fuel });
  } else {
    res.status(404).json({ message: "Fuel not found" });
  }
});

// Routes for per capita emissions data
app.get("/api/per-capita-emissions", (req, res) => {
  res.json(perCapitaData);
});

app.get("/api/per-capita-emissions/:country", (req, res) => {
  const country = req.params.country;
  const countryData = perCapitaData.find((data) => data.Country === country);
  if (countryData) {
    res.json(countryData);
  } else {
    res.status(404).json({ message: "Country not found" });
  }
});
// ... (existing imports and configurations)

app.listen(port, () => {
  console.log(`Server is started at ${port}`);
});
