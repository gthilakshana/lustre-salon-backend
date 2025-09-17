import Appointment from "../models/appointment.js"; // <-- include .js extension


export const createAppointment = async (req, res) => {
  try {
    const { stylistName, services, date, time, type, fullPayment } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: Customer not logged in" });
    }

    const newAppointment = await Appointment.create({
      stylistName,
      services,
      date,
      time,
      type,
      fullPayment,
      customer: req.user._id, 
    });

    res.status(201).json({ message: "Appointment created successfully", appointment: newAppointment });
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).json({ message: "Failed to create appointment", error: err.message });
  }
};


export const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find();
    res.status(200).json(appointments);
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({ message: "Failed to fetch appointments", error: err.message });
  }
};


export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAppointment = await Appointment.findByIdAndDelete(id);
    if (!deletedAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json({ message: "Appointment deleted successfully" });
  } catch (err) {
    console.error("Error deleting appointment:", err);
    res.status(500).json({ message: "Failed to delete appointment", error: err.message });
  }
};


export const saveAppointmentsAfterPayment = async (req, res) => {
  try {
    const { cartItems } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: Customer not logged in" });
    }

    const savedAppointments = [];

    for (const item of cartItems) {
      const appointment = await Appointment.create({
        stylistName: item.stylist,
        services: item.services,
        date: item.date,
        time: item.time,
        type: item.gender,
        fullPayment: parseFloat(item.price.replace(/,/g, "").replace(" LKR", "")),
        customer: req.user._id,
      });
      savedAppointments.push(appointment);
    }

    res.status(201).json({ message: "Appointments saved successfully", savedAppointments });
  } catch (err) {
    console.error("Error saving appointments after payment:", err);
    res.status(500).json({ message: "Failed to save appointments", error: err.message });
  }
};
