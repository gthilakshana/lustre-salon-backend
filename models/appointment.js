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
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
