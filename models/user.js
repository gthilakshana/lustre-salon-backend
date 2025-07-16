import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    
    {
        email: {
            type: String,
            required: true,
            unique: true
        },
        fistName:{
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            required: true,
            default: "user",
            
        },
        isBlocked: {
            type: Boolean,
            default: false
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        image: {
            type: String,
            default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
        }

    }
) 

const User = mongoose.model('User', userSchema)

export default User