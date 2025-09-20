import Appointment from "../models/appointment.js";

// ---------------- Create appointment (general) ----------------
export const createAppointment = async (req, res) => {
  try {
    const { stylistName, serviceName, subName, date, time, type, fullPayment, duePayment, paymentType } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: User not logged in" });
    }

    const newAppointment = await Appointment.create({
      stylistName,
      serviceName,
      subName,
      date,
      time,
      type,
      paymentType,
      fullPayment,
      duePayment,
      user: req.user._id
    });

    res.status(201).json({
      message: "Appointment created successfully",
      appointment: newAppointment
    });
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).json({ message: err.message || "Failed to create appointment" });
  }
};

// ---------------- Get all appointments ----------------
export const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("user", "fullName email")         
      .populate("serviceName", "serviceName")    
      .populate("subName", "subName");            
    res.status(200).json(appointments);
  } catch (err) {
    console.error("Get appointments error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch appointments" });
  }
};

// ---------------- Delete appointment ----------------
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Appointment.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment deleted successfully" });
  } catch (err) {
    console.error("Error deleting appointment:", err);
    res.status(500).json({ message: err.message || "Failed to delete appointment" });
  }
};

// ---------------- Book Only ----------------
export const saveAppointmentsBookOnly = async (req, res) => {
  try {
    const { appointments } = req.body;
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: User not logged in" });
    }
    if (!appointments?.length) {
      return res.status(400).json({ message: "No appointments provided" });
    }

    const savedAppointments = [];

    for (const item of appointments) {
      if (!item.serviceName || !item.subName) {
        throw new Error("serviceName and subName are required for appointment");
      }

      const appointment = await Appointment.create({
        stylistName: item.stylistName || "Unnamed Stylist",
        serviceName: item.serviceName,
        subName: item.subName,
        date: new Date(item.date),
        time: item.time,
        type: item.type || item.gender,
        paymentType: "Book Only",
        fullPayment: 0,
        duePayment: item.duePayment || Number(item.price) || 0,
        user: req.user._id
      });

      savedAppointments.push(appointment);
    }

    res.status(201).json({ message: "Appointments booked successfully", savedAppointments });
  } catch (err) {
    console.error("Error booking appointments:", err);
    res.status(500).json({ message: err.message || "Failed to book appointments" });
  }
};


// ---------------- Get my appointments ----------------
export const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user._id })
      .populate("user", "fullName email")         
      .populate("serviceName", "serviceName")
      .populate("subName", "subName");
    res.status(200).json(appointments);
  } catch (err) {
    console.error("Error fetching my appointments:", err);
    res.status(500).json({ message: err.message || "Failed to fetch appointments" });
  }
};

// ---------------- Save after payment ----------------
export const saveAppointmentsAfterPayment = async (req, res) => {
  try {
    const { cartItems, paymentOption } = req.body;
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const savedAppointments = [];
    for (const item of cartItems) {
      let fullPayment = item.fullPayment || 0;
      let duePayment = 0;

      if (paymentOption === "half") {
        fullPayment = fullPayment / 2;
        duePayment = fullPayment;
      } else if (paymentOption === "book-only") {
        fullPayment = 0;
        duePayment = item.fullPayment || 0;
      }

      const appointment = await Appointment.create({
        stylistName: item.stylistName || "Unnamed Stylist",
        serviceName: item.serviceName,
        subName: item.subName,
        date: new Date(item.date),
        time: item.time,
        type: item.type,
        paymentType: paymentOption === "half" ? "Half" : "Full",
        fullPayment,
        duePayment,
        user: req.user._id,
        status: "Pending"
      });

      savedAppointments.push(appointment);
    }

    res.status(201).json({
      message: "Appointments saved successfully",
      savedAppointments
    });
  } catch (err) {
    console.error("Error saving appointments after payment:", err);
    res.status(500).json({ message: err.message || "Failed to save appointments" });
  }
};
