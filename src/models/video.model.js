import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema = new Schema(
    {
        videofile: {
            type: String, // URL to the video file from cloudinary
            required: true,
        },
        thumbnail: {
            type: String, // URL to the thumbnail image from cloudinary
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            trim: true,
        },
        duration: {
            type: Number, // Duration in seconds this can be get from cloudinary response that we get when we upload any media on cloudinary
            required: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
