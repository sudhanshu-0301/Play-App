import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const regesterUser = asyncHandler(async (req, res) => {
    // get data from req body
    const { fullname, email, username, password } = req.body;

    console.log(fullname, email, username, password);

    // validate the data
    if (
        [fullname, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // check if user already exists : By user name or email
    const existedUser = User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(
            409,
            "User already exists with this username or email"
        );
    }

    // check for the files : avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;

    const coverimageLocalPath = req.files?.coverimage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    // store image to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverimage = await uploadOnCloudinary(coverimageLocalPath);

    // check for image upload
    if (!avatar) {
        throw new ApiError(
            500,
            "Could not upload avatar. Please try again later"
        );
    }

    // create user object : create entry in db
    const user = await User.create({
        fullname,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverimage: coverimage?.url || "",
    });

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refershToken"
    );

    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "User was not created. Please try again later");
    }

    // send response
    return res
        .status(201)
        .json(new ApiResponse(200, createdUser, "User created successfully"));
});

export { regesterUser };
