import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import mongoose, { Schema, type Document } from "mongoose";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI ?? "";
const jwtSecret = process.env.JWT_SECRET ?? "";

if (!mongoUri || !jwtSecret) {
  throw new Error("MONGODB_URI and JWT_SECRET are required");
}

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  role: "guest" | "staff" | "admin";
  createdAt: Date;
}

interface HotelDocument extends Document {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  starRating: number;
  imageUrl?: string;
}

interface RoomDocument extends Document {
  hotelId: mongoose.Types.ObjectId;
  category: string;
  description?: string;
  roomNumber: string;
  floor?: number;
  capacity: number;
  amenities: string[];
  price: number;
  status: "available" | "occupied" | "cleaning" | "maintenance" | "reserved";
  imageUrl?: string;
}

interface BookingDocument extends Document {
  guestId: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
  totalAmount: number;
  createdAt: Date;
}

const User = mongoose.model<UserDocument>("User", new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true, trim: true },
  phone: String,
  role: { type: String, enum: ["guest", "staff", "admin"], default: "guest" },
  createdAt: { type: Date, default: Date.now },
}));

const Hotel = mongoose.model<HotelDocument>("Hotel", new Schema({
  name: { type: String, required: true },
  description: String,
  address: String,
  city: String,
  country: String,
  phone: String,
  email: String,
  starRating: { type: Number, default: 4 },
  imageUrl: String,
}));

const Room = mongoose.model<RoomDocument>("Room", new Schema({
  hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
  category: { type: String, required: true },
  description: String,
  roomNumber: { type: String, required: true },
  floor: Number,
  capacity: { type: Number, default: 2 },
  amenities: { type: [String], default: [] },
  price: { type: Number, required: true },
  status: { type: String, enum: ["available", "occupied", "cleaning", "maintenance", "reserved"], default: "available" },
  imageUrl: String,
}));

const Booking = mongoose.model<BookingDocument>("Booking", new Schema({
  guestId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
  roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  guests: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["pending", "confirmed", "checked_in", "checked_out", "cancelled"], default: "pending" },
  totalAmount: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
}));

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: UserDocument["role"] };
}

function createToken(user: UserDocument) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, jwtSecret, { expiresIn: "7d" });
}

function publicUser(user: UserDocument) {
  return { id: user._id.toString(), email: user.email, fullName: user.fullName, phone: user.phone, role: user.role, createdAt: user.createdAt };
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(token, jwtSecret) as unknown as { id: string; role: UserDocument["role"] };
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles: UserDocument["role"][]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body as { email?: string; password?: string; fullName?: string };
    if (!email || !password || !fullName || password.length < 6) return res.status(400).json({ error: "Name, email, and a password of at least 6 characters are required" });
    const exists = await User.exists({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: "An account with this email already exists" });
    const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 12), fullName, role: "guest" });
    return res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const user = email ? await User.findOne({ email: email.toLowerCase() }) : null;
    if (!user || !password || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: "Invalid email or password" });
    return res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(401).json({ error: "User not found" });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/profile", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { fullName, phone } = req.body as { fullName?: string; phone?: string };
    const user = await User.findByIdAndUpdate(req.user?.id, { fullName, phone }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/hotels", async (_req, res, next) => {
  try {
    return res.json(await Hotel.find().sort({ name: 1 }));
  } catch (error) {
    next(error);
  }
});

app.get("/api/rooms", async (req, res, next) => {
  try {
    const hotelId = typeof req.query.hotelId === "string" ? req.query.hotelId : undefined;
    const filter = hotelId ? { hotelId } : {};
    return res.json(await Room.find(filter).populate("hotelId").sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
});

app.get("/api/bookings", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const filter = req.user?.role === "guest" ? { guestId: req.user.id } : {};
    return res.json(await Booking.find(filter).populate("roomId hotelId guestId").sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/bookings", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { hotelId, roomId, checkIn, checkOut, guests, totalAmount } = req.body as {
      hotelId?: string;
      roomId?: string;
      checkIn?: string;
      checkOut?: string;
      guests?: number;
      totalAmount?: number;
    };
    if (!hotelId || !roomId || !checkIn || !checkOut || !guests || totalAmount === undefined) return res.status(400).json({ error: "Complete booking details are required" });
    const conflict = await Booking.exists({ roomId, status: { $in: ["pending", "confirmed", "checked_in"] }, checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } });
    if (conflict) return res.status(409).json({ error: "This room is already booked for those dates" });
    const booking = await Booking.create({ guestId: req.user?.id, hotelId, roomId, checkIn, checkOut, guests, totalAmount });
    return res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/bookings/:id/status", requireAuth, requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    return res.json(booking);
  } catch (error) {
    next(error);
  }
});

app.post("/api/rpc/:name", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const args = req.body as Record<string, unknown>;
    if (req.params.name === "set_user_role") {
      const user = await User.findByIdAndUpdate(args.p_target_user, { role: args.p_role }, { new: true });
      return user ? res.json({ data: publicUser(user), error: null }) : res.status(404).json({ error: "User not found" });
    }
    if (req.params.name === "assign_staff") {
      const collection = mongoose.connection.collection("staff_assignments");
      const result = await collection.insertOne({ user_id: args.p_user_id, hotel_id: args.p_hotel_id, department: args.p_department, role: "staff", created_at: new Date().toISOString() });
      return res.json({ data: { id: result.insertedId.toString() }, error: null });
    }
    if (req.params.name === "remove_staff_assignment") {
      await mongoose.connection.collection("staff_assignments").deleteOne({ _id: new mongoose.Types.ObjectId(String(args.p_assignment_id)) });
      return res.json({ data: null, error: null });
    }
    return res.status(404).json({ error: "Unknown operation" });
  } catch (error) {
    next(error);
  }
});

const dataCollections = new Set(["profiles", "hotels", "rooms", "room_categories", "bookings", "payments", "reviews", "notifications", "service_requests", "staff_assignments", "seasonal_rates", "activity_logs", "invoices"]);

function dataCollectionName(table: string) {
  return table === "profiles" ? "users" : table;
}

function normalizeData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeData);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = { ...source };
  if (source._id) {
    result.id = String(source._id);
    delete result._id;
  }
  if (source.__v !== undefined) delete result.__v;
  if (source.passwordHash !== undefined) delete result.passwordHash;
  return result;
}

function dataFilters(query: Record<string, unknown>) {
  const filters: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith("eq.")) filters[key.slice(3)] = value;
    if (key.startsWith("in.")) filters[key.slice(3)] = { $in: String(value).split(",") };
  }
  return filters;
}

app.get("/api/data/:table", async (req, res, next) => {
  try {
    if (!dataCollections.has(req.params.table)) return res.status(404).json({ error: "Unknown data collection" });
    const collection = mongoose.connection.collection(dataCollectionName(req.params.table));
    const query = dataFilters(req.query as Record<string, unknown>);
    const count = await collection.countDocuments(query);
    if (req.query.head === "true") return res.json({ data: null, count });
    const orderBy = typeof req.query.orderBy === "string" ? req.query.orderBy : "created_at";
    const ascending = req.query.orderAsc !== "false";
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 0;
    const cursor = collection.find(query).sort({ [orderBy]: ascending ? 1 : -1 });
    if (limit > 0) cursor.limit(limit);
    return res.json({ data: normalizeData(await cursor.toArray()), count });
  } catch (error) {
    next(error);
  }
});

app.post("/api/data/:table", async (req, res, next) => {
  try {
    if (!dataCollections.has(req.params.table)) return res.status(404).json({ error: "Unknown data collection" });
    const collection = mongoose.connection.collection(dataCollectionName(req.params.table));
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const result = await collection.insertMany(records);
    const ids = Object.values(result.insertedIds);
    const created = await collection.find({ _id: { $in: ids } }).toArray();
    return res.status(201).json({ data: normalizeData(created), error: null });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/data/:table", async (req, res, next) => {
  try {
    if (!dataCollections.has(req.params.table)) return res.status(404).json({ error: "Unknown data collection" });
    const collection = mongoose.connection.collection(dataCollectionName(req.params.table));
    const filter = dataFilters(req.query as Record<string, unknown>);
    const update = { ...req.body };
    delete update.id;
    await collection.updateMany(filter, { $set: update });
    return res.json({ data: normalizeData(await collection.find(filter).toArray()), error: null });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/data/:table", async (req, res, next) => {
  try {
    if (!dataCollections.has(req.params.table)) return res.status(404).json({ error: "Unknown data collection" });
    const collection = mongoose.connection.collection(dataCollectionName(req.params.table));
    const filter = dataFilters(req.query as Record<string, unknown>);
    await collection.deleteMany(filter);
    return res.json({ data: null, error: null });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
});

mongoose.connect(mongoUri).then(() => {
  app.listen(port, () => console.log(`HotelPro API listening on port ${port}`));
}).catch((error: unknown) => {
  console.error("MongoDB connection failed", error);
  process.exit(1);
});
