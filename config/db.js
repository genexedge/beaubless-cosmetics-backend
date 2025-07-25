import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URI);
    console.log(`Connection to mongodb Database ${conn.connection.host}`);
  } catch (error) {
    console.log(`error in mongodb ${error}`);
  }
};

export default connectDB;
