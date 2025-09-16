import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar: {
            type: String, // URL to the avatar image from cloudinary
            required: true,
        },
        coverimage: {
            type: String, // URL to the cover image from cloudinary
        },
        watchHistory: {
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        refershToken: {
            type: String,
        },
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); // If password is not modified, skip hashing
    
    // Hash the password before saving the user model
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password);
}


userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        { 
            _id: this._id, 
            username: this.username,
            email: this.email,
            fullname: this.fullname,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d' }
    );
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        { 
             _id: this._id, 
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '10d' }
    );
}

export const User = mongoose.model("User", userSchema);
