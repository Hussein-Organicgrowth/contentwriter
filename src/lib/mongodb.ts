import mongoose, { Mongoose } from "mongoose";

const MONGODB_URI: string = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
	throw new Error("Please define the MONGODB_URI environment variable");
}

interface MongooseCache {
	conn: Mongoose | null;
	promise: Promise<Mongoose> | null;
}

// Extend the global namespace to include the mongoose cache
declare global {
	var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = (global as any).mongoose || {
	conn: null,
	promise: null,
};

async function connectToDatabase(): Promise<Mongoose> {
	if (cached.conn) {
		return cached.conn;
	}

	if (!cached.promise) {
		const opts: mongoose.ConnectOptions = {
			bufferCommands: false,
			// Add other options if necessary
		};

		cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
			return mongoose;
		});
	}

	cached.conn = await cached.promise;
	return cached.conn;
}

export default connectToDatabase;
