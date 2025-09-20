import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Save the refresh token in the database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong: Failed to generate tokens"
        );
    }
};

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

const loginUser = asyncHandler(async (req, res) => {
    // get username , email and password from req body
    const { username, email, password } = req.body;

    // validate the inputs - all fields are required and not empty
    if (!username && !email) {
        throw new ApiError(400, "Username or Email is required");
    }

    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    // check if user exists with the provided username or email
    const user = await User.findOne({
        $or: [
            { username: username.trim().toLowerCase() },
            { email: email.trim() },
        ],
    });

    if (!user) {
        throw new ApiError(404, "User not found with this username or email");
    }

    // check if password matches
    const isPasswordMatched = await user.isPasswordCorrect(password);

    if (!isPasswordMatched) {
        throw new ApiError(401, "Invalid credentials: Incorrect password");
    }

    // generate access token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true, // set to true if using https
    };

    // send success response with user details and access token

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    // get user id from req.user
    const userId = req.user._id;

    // find the user by id and update the refresh token to null
    await User.findByIdAndUpdate(
        userId,
        {
            $unset: {
                refreshToken: undefined,
            },
        },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true, // set to true if using https
    };

    return res
        .status(200)
        .cookie("refreshToken", options)
        .cookie("accessToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(
            401,
            "Unauthorized Request: Refresh token is required"
        );
    }

    try {
        // verify the refresh token
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(404, "Invalid Refresh Token: User not found");
        }

        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(
                401,
                "Refresh Token is expired or used, please login again"
            );
        }

        // generate new access token
        const { accessToken, newrefreshToken } =
            await generateAccessAndRefreshToken(user._id);

        const options = {
            httpOnly: true,
            secure: true, // set to true if using https
        };

        return res
            .status(200)
            .cookie("refreshToken", newrefreshToken, options)
            .cookie("accessToken", accessToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, newrefreshToken },
                    "Access token refreshed successfully"
                )
            );
    } catch (error) {
        throw new ApiError(
            401,
            error?.meaage || "Invalid or Expired Refresh Token"
        );
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPasword, newPassword } = req.body;

    if (!oldPasword || !newPassword) {
        throw new ApiError(400, "Both old and new passwords are required");
    }

    const user = await User.findById(req.user?.id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPasword);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "Current user fetched successfully")
        );
});

const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;

    if (!fullname || !email) {
        throw new ApiError(400, "Fullname and Email are required");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            fullname,
            email: email.toLowerCase(),
        },
    }).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    // Upload avatar avatar and coverimage to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Failed to upload avatar image on Cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User avatar updated successfully"));
});

const updateUserCoverimage = asyncHandler(async (req, res) => {
    const coverimageLocalPath = req.file?.path;

    if (!coverimageLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    // Upload avatar avatar and coverimage to Cloudinary
    const coverimage = await uploadOnCloudinary(coverimageLocalPath);

    if (!coverimage) {
        throw new ApiError(400, "Failed to upload avatar image on Cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverimage: coverimage.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "User coverimage updated successfully")
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateUserDetails,
    updateUserAvatar,
    updateUserCoverimage,
};
