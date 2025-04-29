const express = require("express");
const dotEnv = require("dotenv");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = express();
const port = process.env.PORT || 4000;
const middleware = require("./middleware");
const cors = require("cors");
const fs = require("fs");
const Razorpay = require("razorpay");

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
const razorpay = new Razorpay({
  key_id: "rzp_test_KStLt14203VFVn",
  key_secret: "Od2TZxpkVAXRQhxogFzzN3Nf",
});
const UserSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["farmer", "user", "admin"], default: "user" },
});

const User = mongoose.model("User", UserSchema);
const plantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  imageUrl: { type: String, required: true }, // price * quantity
});
const PlantsUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  imageUrl: { type: String, required: true },
});
const PlantsUser = mongoose.model("PlantsUser", PlantsUserSchema);

// Define the Order Schema
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to User
  plants: [plantSchema], // List of plants ordered
  totalAmount: { type: Number, required: true }, // Total order amount
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  },
  paymentDetails: {
    razorpay_order_id: { type: String },
    razorpay_payment_id: { type: String },
    payment_status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    amount: { type: Number, required: true }, // Payment amount
  },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);
const orderSchema2 = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to User
  plants: [plantSchema], // List of plants ordered
  totalAmount: { type: Number, required: true }, // Total order amount
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  },
  paymentDetails: {
    razorpay_order_id: { type: String },
    razorpay_payment_id: { type: String },
    payment_status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    amount: { type: Number, required: true }, // Payment amount
  },
  createdAt: { type: Date, default: Date.now },
});

const Order2 = mongoose.model("Order2", orderSchema2);
const plantSaleSchema = new mongoose.Schema({
  plants: [
    {
      name: String,
      price: Number,
      quantity: Number,
      imageUrl: String,
    },
  ],
  totalAmount: Number,
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  buyer: { type: String, default: "Green Investment Company" },
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
});

const PlantSale = mongoose.model("PlantSale", plantSaleSchema);
// Register route
const secretKey = "greeninvestment"; // Set this to a secret key known only to the admin

// Register route
app.post("/register", async (req, res) => {
  try {
    const {
      fullname,
      email,
      mobile,
      password,
      confirmpassword,
      role,
      adminSecretKey,
    } = req.body;

    // Validate required fields
    if (!fullname || !email || !mobile || !password || !confirmpassword) {
      return res.status(400).send("All fields are required");
    }

    // If the user is an admin, check if the secretKey is provided
    if (role === "admin" && adminSecretKey !== secretKey) {
      return res.status(403).send("Invalid secret key for admin role");
    }

    // Check if passwords match
    if (password !== confirmpassword) {
      return res.status(400).send("Passwords do not match");
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      fullname,
      email,
      mobile,
      password: hashedPassword,
      role: role || "user", // Default role is "user"
    });

    // Save the user to the database
    await newUser.save();

    res.status(200).send("User registered successfully");
  } catch (error) {
    console.error("Error during registration:", error.message);
    res.status(500).send("Server error: " + error.message);
  }
});

// Login route
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).send("Email and password are required");
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send("Invalid credentials");
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send("Invalid credentials");
    }

    // Create a JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    // Generate the token
    const token = jwt.sign(payload, process.env.JWT_SECRET || "defaultSecret", {
      expiresIn: "1d",
    });

    // Respond with the token and role
    res.status(200).json({ token, role: user.role, id: user.id });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).send("Server error: " + error.message);
  }
});
app.post("/release-to-userstore", async (req, res) => {
  try {
    const plantDetails = req.body;

    // Add plant details to PlantsUserSchema
    const newPlantUser = new PlantsUser(plantDetails);
    await newPlantUser.save();

    res.status(201).json({ message: "Plant details added to UserStore." });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error releasing plant to UserStore.", error });
  }
});
app.get("/userplants", async (req, res) => {
  try {
    const plants = await PlantsUser.find(); // Find all plants in the PlantsUser collection
    res.status(200).json(plants); // Send the plant details as JSON to the frontend
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching plant data.", error: error.message });
  }
});
app.get("/allprofiles", middleware, async (req, res) => {
  try {
    const data = await User.find();
    return res.status(200).json({ data });
  } catch (error) {
    console.log("error is", error);
  }
});
app.get("/allprofiles/:regNo", async (req, res) => {
  try {
    const regNo = req.params.regNo; // Accessing the value of 'regNo' route parameter

    // Use the 'regNo' value to search for the
    //  user in the database
    const user = await User.findOne({ admissionNumber: regNo });

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
    const mydata = await User.findById(req.user.id);
    return res.status(200).json({ mydata });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Server error" });
  }
});
app.post("/create-order", async (req, res) => {
  const { id, plants } = req.body; // Expecting userId and plants array from the client

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate total amount for the order
    let totalAmount = 0;
    const plantDetails = plants.map((plant) => {
      const totalPrice = plant.price * plant.quantity;
      totalAmount += totalPrice;
      return { ...plant, totalPrice };
    });

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100, // Amount in paise
      currency: "INR",
      receipt: `order_rcptid_${new Date().getTime()}`,
    });

    // Create the order record in MongoDB
    const newOrder = new Order({
      user: user._id,
      plants: plantDetails,
      totalAmount,
      paymentDetails: {
        razorpay_order_id: razorpayOrder.id,
        amount: totalAmount,
        payment_status: "pending",
      },
    });

    // Save the order to the database
    await newOrder.save();

    // Return the Razorpay order ID to the client
    res.status(200).json({
      orderId: razorpayOrder.id,
      amount: totalAmount,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.post("/payment-success", async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, id } = req.body;

  try {
    const order = await Order.findOne({
      "paymentDetails.razorpay_order_id": razorpay_order_id,
      user: id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update the order's payment details
    order.paymentDetails.razorpay_payment_id = razorpay_payment_id;
    order.paymentDetails.payment_status = "success";

    // Update order status
    order.status = "completed";

    await order.save();

    res.status(200).json({ message: "Payment successful" });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.post("/create-order2", async (req, res) => {
  const { id, plants } = req.body; // Expecting userId and plants array from the client

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate total amount for the order
    let totalAmount = 0;
    const plantDetails = plants.map((plant) => {
      const totalPrice = plant.price * plant.quantity;
      totalAmount += totalPrice;
      return { ...plant, totalPrice };
    });

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100, // Amount in paise
      currency: "INR",
      receipt: `order_rcptid_${new Date().getTime()}`,
    });

    // Create the order record in MongoDB
    const newOrder = new Order2({
      user: user._id,
      plants: plantDetails,
      totalAmount,
      paymentDetails: {
        razorpay_order_id: razorpayOrder.id,
        amount: totalAmount,
        payment_status: "pending",
      },
    });

    // Save the order to the database
    await newOrder.save();

    // Return the Razorpay order ID to the client
    res.status(200).json({
      orderId: razorpayOrder.id,
      amount: totalAmount,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.post("/payment-success2", async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, id } = req.body;

  try {
    const order = await Order2.findOne({
      "paymentDetails.razorpay_order_id": razorpay_order_id,
      user: id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update the order's payment details
    order.paymentDetails.razorpay_payment_id = razorpay_payment_id;
    order.paymentDetails.payment_status = "success";

    // Update order status
    order.status = "completed";

    await order.save();

    res.status(200).json({ message: "Payment successful" });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/orders/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch only orders with successful payments for the given user
    const orders = await Order.find({
      user: id,
      "paymentDetails.payment_status": "success",
    }).populate("user", "fullname email");

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No successful payments found for the user.",
      });
    }

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching successful orders for user:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching successful orders.",
    });
  }
});

app.get("/ordered-payments", async (req, res) => {
  try {
    const orderedPayments = await Order.find({
      "paymentDetails.payment_status": "success",
    })
      .populate("user", "fullname email") // Assuming user field references a user model
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orderedPayments,
    });
  } catch (error) {
    console.error("Error fetching ordered payments:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching ordered payments.",
    });
  }
});
// Routes
app.post("/add-sale", async (req, res) => {
  const { plants, totalAmount, farmerId } = req.body;

  try {
    // Validate farmerId
    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({ message: "Invalid farmerId" });
    }

    // Check if farmer exists
    const farmer = await User.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    // Create a new plant sale
    const plantSale = new PlantSale({
      plants,
      totalAmount,
      farmerId,
    });

    await plantSale.save();
    res
      .status(201)
      .json({ message: "Plant sale recorded successfully", plantSale });
  } catch (error) {
    console.error("Error recording plant sale:", error.message);
    res.status(500).json({ message: "Error recording plant sale" });
  }
});

app.get("/adminsales", async (req, res) => {
  try {
    const allSales = await PlantSale.find(); // Sort by date, most recent first
    if (allSales.length === 0) {
      return res.status(404).json({ message: "No sales found" });
    }
    res.json(allSales);
  } catch (error) {
    console.error("Error fetching all sales:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/getadminsales", async (req, res) => {
  try {
    // Fetch all plant sales with farmer details
    const sales = await PlantSale.find().populate(
      "farmerId",
      "fullname email mobile"
    ); // Populate farmer name and email
    res.status(200).json({ message: "Sales retrieved successfully", sales });
  } catch (error) {
    console.error("Error fetching sales:", error.message);
    res.status(500).json({ message: "Error fetching sales" });
  }
});
app.get("/getsales/:farmerId", async (req, res) => {
  const { farmerId } = req.params; // Extract farmerId from route params

  try {
    // Fetch sales for the specific farmerId
    const sales = await PlantSale.find({ farmerId }).populate(
      "farmerId",
      "fullname email mobile"
    ); // Populate farmer details

    if (sales.length === 0) {
      return res
        .status(404)
        .json({ message: "No sales found for this farmer" });
    }

    res.status(200).json({ message: "Sales retrieved successfully", sales });
  } catch (error) {
    console.error("Error fetching sales:", error.message);
    res.status(500).json({ message: "Error fetching sales" });
  }
});
app.put("/update-sale-status/:id", async (req, res) => {
  const { status } = req.body;

  try {
    const sale = await PlantSale.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    res.status(200).json({ message: "Sale status updated", sale });
  } catch (error) {
    console.error("Error updating sale status:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/recent-payments", async (req, res) => {
  try {
    const payments = await razorpay.payments.all({
      count: 10, // Get the 10 most recent payments
      skip: 0,
    });

    res.status(200).json({
      success: true,
      data: payments.items,
    });
  } catch (error) {
    console.error("Error fetching payments:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching payments.",
    });
  }
});
app.get("/pie-chart", async (req, res) => {
  try {
    const completedOrders = await Order.countDocuments({
      "paymentDetails.payment_status": "success",
    });
    const pendingOrders = await Order.countDocuments({
      "paymentDetails.payment_status": "pending",
    });

    res.status(200).json({
      success: true,
      data: {
        completed: completedOrders,
        pending: pendingOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching pie chart data:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching data for pie chart.",
    });
  }
});
app.get("/order-details/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch all orders related to the user
    const orders = await Order2.find({ user: userId }).populate("plants");

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders found for this user." });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: "Server error, try again later." });
  }
});
// Line Chart - Total Amount Over Time (by Date)
app.get("/line-chart", async (req, res) => {
  try {
    const orders = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const labels = orders.map((order) => order._id);
    const data = orders.map((order) => order.totalAmount);

    res.status(200).json({
      success: true,
      data: {
        labels,
        data,
      },
    });
  } catch (error) {
    console.error("Error fetching line chart data:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching data for line chart.",
    });
  }
});
app.get("/completed-orders", async (req, res) => {
  try {
    const completedOrders = await Order.find(
      { status: "completed" },
      { plants: 1 }
    );

    // Map through orders and flatten the plant array
    const products = completedOrders.flatMap((order) =>
      order.plants.map((plant) => ({
        _id: plant._id,
        name: plant.name,
        price: plant.price,
        quantity: plant.quantity,
        totalPrice: plant.totalPrice,
        imageUrl: plant.imageUrl,
        isReleased: plant.isReleased || false, // Default to false if not present
      }))
    );

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching completed orders:", error.message);
    res.status(500).json({ message: "Failed to fetch completed orders." });
  }
});

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

app.listen(port, () => {
  console.log(`Server is started at ${port}`);
});
