import mongoose from "mongoose"

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/elevate"

    await mongoose.connect(mongoURI)
    console.log("MongoDB connected successfully")
  } catch (error) {
    console.error("MongoDB connection error:", error)
    console.log("Server will continue running without database connection")
    console.log("Please check your MONGODB_URI environment variable")
    // Don't exit - allow server to run for debugging
  }
}

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect()
    console.log("MongoDB disconnected")
  } catch (error) {
    console.error("MongoDB disconnection error:", error)
  }
}
