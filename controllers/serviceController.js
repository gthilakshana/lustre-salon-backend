import Service from "../models/service.js";

// GET all services
export const getServices = async (req, res) => {
    try {
        const services = await Service.find();
        res.status(200).json(services);
    } catch (err) {
        console.error("Error fetching services:", err);
        res.status(500).json({ message: "Failed to fetch services", error: err.message });
    }
};

// CREATE new service
export const createService = async (req, res) => {
    try {
        const { serviceName, subName, price, description, status } = req.body;

        const newService = await Service.create({
            serviceName,
            subName,
            price,
            description,
            status,
        });

        res.status(201).json({ message: "Service created successfully", service: newService });
    } catch (err) {
        console.error("Error creating service:", err);
        res.status(500).json({ message: "Failed to create service", error: err.message });
    }
};

// DELETE service
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedService = await Service.findByIdAndDelete(id);
        if (!deletedService) {
            return res.status(404).json({ message: "Service not found" });
        }
        res.json({ message: "Service deleted successfully" });
    } catch (err) {
        console.error("Error deleting service:", err);
        res.status(500).json({ message: "Failed to delete service", error: err.message });
    }
};

// UPDATE service
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { serviceName, subName, price, description, status } = req.body;

        const updatedService = await Service.findByIdAndUpdate(
            id,
            { serviceName, subName, price, description, status },
            { new: true }
        );

        if (!updatedService) {
            return res.status(404).json({ message: "Service not found" });
        }

        res.json({ message: "Service updated successfully", service: updatedService });
    } catch (err) {
        console.error("Error updating service:", err);
        res.status(500).json({ message: "Failed to update service", error: err.message });
    }
};


