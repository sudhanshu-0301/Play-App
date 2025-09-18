import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import e from "express";

const registerUser = asyncHandler(async (req, res) => {
    console.log("In Register Router");

    // Extract user details from the request body
    const { fullname, username, email, password } = req.body;
    console.log("User Details:", { username, email });

    // Validate that all required fields are provided and not empty
    if (
        !fullname ||
        !email ||
        !username ||
        !password ||
        fullname.trim() === "" ||
        email.trim() === "" ||
        username.trim() === "" ||
        password.trim() === ""
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if a user with the provided email already exists
    const existingUser = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (existingUser) {
        throw new ApiError(
            409,
            "User already exists with this email or username"
        );
    }

    // check if images are provided
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverimageLocalPath = req.files?.coverimage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    let coverimageLocalPath;

    if (
        req.files &&
        Array.isArray(req.files.coverimage) &&
        req.files.coverimage.length > 0
    ) {
        coverimageLocalPath = req.files.coverimage[0].path;
    }

    // Upload avatar avatar and coverimage to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    const coverimage = await uploadOnCloudinary(coverimageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Failed to upload avatar image on Cloudinary");
    }

    // Create a new user instance
    const user = await User.create({
        fullname,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverimage: coverimage?.url || "",
    });

    // check if user is created
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong: Failed to create user");
    }

    // Send a success response with the created user details (excluding password)
    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered successfully")
        );
});

export { registerUser };
