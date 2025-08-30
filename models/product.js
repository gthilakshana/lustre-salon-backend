import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    
    {
        productID:{
            type: String,
            required: true,
            unique: true
        },

        name:{
         type: String,
         required: true
        },

        stock:{
            type: Number,
            required: true
        },

        altName: {
           type: [String],
           required: true,
           required: true
        },
        description:{
            type: String,
            required: true
        },
        images:{
            type: [String],
            default: [],
            required: true
        },
        price:{
            type: Number,
            required: true
        },
        labelledPrice:{
            type: Number,
            required: true
        },
        category: {
            type: String,
            required: true
        }
    }
) 

const Product = mongoose.model('Product', productSchema)

export default Product