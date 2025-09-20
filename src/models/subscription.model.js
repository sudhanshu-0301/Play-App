import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // The user who is subscribing
        ref: "User"
    },

    channel: {
        type: Schema.Types.ObjectId, // The user who is being subscribed to
        ref: "User"
    }


})


export const Subscription = mongoose.model("Subscription", subscriptionSchema);