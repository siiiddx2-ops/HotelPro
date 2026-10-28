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
