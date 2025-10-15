import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  stylistName: {
    type: String,
    required: true,
    trim: true
  },

  
 serviceName: {
   type:String,
   required: true
 },

 subName: {
    type: String,
    required: true
 },


  date: {
    type: Date,
    required: true
  },

  
  time: {
    type: String,
    required: true
  },
  endTime: {
        type: String,
        // Not required here, as the controller can calculate it, 
        // but it must exist in the schema.
    }, 


  type: {
    type: String,
    enum: ["Gents", "Ladies"],
    required: true
  },
  paymentType: {
    type: String,
    enum: ["Full", "Half", "Book Only"],
    required: true
  },

   status: {
    type: String,
    enum: ["Pending", "Completed", "Confirmed", "Ongoing", "Cancelled"],
    default: "Pending" 
  },

  fullPayment: {
    type: Number,
    required: true
  },
  duePayment: {
    type: Number,
    required: true,
    default: 0 
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  tempCartId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "TempCart",
        // Not required, as "Book Only" or manual appointments won't have it
    }
}, { timestamps: true });

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
