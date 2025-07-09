import Student from "../models/student.js"

export function getStudents(req, res){

    Student.find()
    .then((data) => {
        console.log(data)
        res.json(data)
    })
    .catch(()=>{});
}


export function createStudent(req, res){
    const student = new Student({
        name: req.body.name,
        age: req.body.age,
        city: req.body.city
    })
    student.save()
    .then(() => {
        console.log(data)
        res.json({
            message: "Student created successfully"
        })
    })
    .catch(() => {
        res.json({
            message: "Error creating student"
        });
    });
}