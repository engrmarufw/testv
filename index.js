const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');

const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;




// middleware
app.use(cors());
app.use(express.json());


console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xhirfgb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error: true, message: 'unauthorized access'});
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
            return res.status(401).send({error: true, message: 'unauthorized access'})
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      const usersCollection = client.db("mmanageDB").collection("users");
      const teacherCollection = client.db("mmanageDB").collection("teachers");
      const studentCollection = client.db("mmanageDB").collection("students");
      const subjectCollection = client.db("mmanageDB").collection("subjects");
  
      app.get('/allusers', async (req, res) => {
        const result = await usersCollection.find().toArray();
        res.send(result);
      });
  
  
  
  
      app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
        res.send({ token })
      })
  
  
  
  
  
      app.post("/register", async (req, res) => {
        const user = req.body;
        // console.log(user);
        const encryptedPassword = await bcrypt.hash(user?.password, 10);
        user.password = encryptedPassword;
        try {
  
          if (user?.role === 'teacher') {
            const query = { email: user.email }
            const existingUser = await teacherCollection.findOne(query);
            if (existingUser) {
              return res.send({ error: "User Exists" });
            }
            const result = await teacherCollection.insertOne(user);
            res.send(result);
          }
          if (user?.role === 'student') {
            const query = { email: user.email }
            const existingUser = await studentCollection.findOne(query);
            if (existingUser) {
              return res.json({ error: "User Exists" });
            }
            const result = await studentCollection.insertOne(user);
            res.send(result);
          }
          if (user?.role === 'admin') {
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
              return res.json({ error: "User Exists" });
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
          }
          // const query = { email: user.email }
          // const existingUser = await usersCollection.findOne(query);
          // if (existingUser) {
          //   return res.json({ error: "User Exists" });
          // }
          // const result = await usersCollection.insertOne(user);
          // res.send(result);
        } catch (error) {
          res.send({ status: "error" });
        }
      });
  
  
  
  
  
  
  
      app.post("/login-user", async (req, res) => {
        const { email, password, roll } = req.body;
  
        const admin = await usersCollection.findOne({ $and: [{ email: email }, { role: "admin" }] });
        const teacher = await teacherCollection.findOne({ $and: [{ email: email }, { role: "teacher" }] });
        const student = await studentCollection.findOne({ $and: [{ email: email }, { role: "student" }] });
        const studentid = await studentCollection.findOne({ $and: [{ roll: roll }, { role: "student" }] });
  
        if (admin) {
          if (await bcrypt.compare(password, admin.password)) {
            const token = jwt.sign({ email: admin.email }, process.env.ACCESS_TOKEN_SECRET, {
              expiresIn: "1h",
            });
  
            if (res.status(201)) {
              return res.json({ status: "ok", data: token });
            } else {
              return res.json({ error: "error" });
            }
          }
        }
        if (teacher) {
          if (await bcrypt.compare(password, teacher.password)) {
            const token = jwt.sign({ email: teacher.email }, process.env.ACCESS_TOKEN_SECRET, {
              expiresIn: "1h",
            });
  
            if (res.status(201)) {
              return res.json({ status: "ok", data: token });
            } else {
              return res.json({ error: "error" });
            }
          }
        }
        if (student) {
          if (await bcrypt.compare(password, student.password)) {
            const token = jwt.sign({ email: student.email }, process.env.ACCESS_TOKEN_SECRET, {
              expiresIn: "1h",
            });
  
            if (res.status(201)) {
              return res.json({ status: "ok", data: token });
            } else {
              return res.json({ error: "error" });
            }
          }
        }
        if (studentid) {
          if (await bcrypt.compare(password, studentid.password)) {
            const token = jwt.sign({ roll: studentid.roll }, process.env.ACCESS_TOKEN_SECRET, {
              expiresIn: "1h",
            });
  
            if (res.status(201)) {
              return res.json({ status: "ok", data: token });
            } else {
              return res.json({ error: "error" });
            }
          }
        }
        else {
          return res.json({ error: "User Not found" });
        }
        res.json({ status: "error", error: "InvAlid Password" });
      });
  
  
  
  
  
  
  
  
  
  
  
  
  
  
      app.get("/user", async (req, res) => {
        const token = req.headers.token;
  
        try {
          const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, res) => {
            if (err) {
              return "token expired";
            }
            return res;
          });
          if (user == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
  
          const useremail = user.email;
          usersCollection.findOne({ email: useremail }, { projection: { password: 0 } })
            .then((data) => {
              res.send(data);
            })
            .catch((error) => {
              res.send({ status: "error", data: error });
            });
        } catch (error) { }
      });
  
  
      app.get("/teachers", async (req, res) => {
        const token = req.headers.token;
  
        try {
          const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, res) => {
            if (err) {
              return "token expired";
            }
            return res;
          });
          if (user == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
  
          const useremail = user.email;
          teacherCollection.findOne({ email: useremail }, { projection: { password: 0 } })
            .then((data) => {
              res.send(data);
            })
            .catch((error) => {
              res.send({ status: "error", data: error });
            });
        } catch (error) { }
      });
  
  
      app.get("/student", async (req, res) => {
        const token = req.headers.token;
  
        try {
          const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, res) => {
            if (err) {
              return "token expired";
            }
            return res;
          });
          if (user == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
  
          const useremail = user.email;
          studentCollection.findOne({ email: useremail }, { projection: { password: 0 } })
            .then((data) => {
              res.send(data);
            })
            .catch((error) => {
              res.send({ status: "error", data: error });
            });
        } catch (error) { }
      });
  
  
  
      //get all teachers
  
      app.get('/allteachers', async (req, res) => {
        const token = req.headers.token;
        try {
          const teachers = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, res) => {
            if (err) {
              return "token expired";
            }
            return res;
          });
          if (teachers == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
          const result = await teacherCollection.find().toArray();
          res.send(result);
        } catch (error) {
  
        }
  
      });
  
  
      //get all teachers
  
      app.get('/allteachers/:id', async (req, res) => {
        const token = req.headers.token;
        try {
          const teachers = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, res) => {
            if (err) {
              return "token expired";
            }
            return res;
          });
          if (teachers == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
          const id = req.params.id;
          const query = { _id: new ObjectId(id) }
          const result = await teacherCollection.findOne(query);
          res.send(result);
        } catch (error) {
  
        }
  
      });
  
  
  
  
  
  
      app.put('/teacher/:id', async (req, res) => {
        const token = req.headers.token;
        const id = req.params.id;
        const newData = req.body;
  
        try {
          const teachers = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
              return "token expired";
            }
            return decoded;
          });
          if (teachers == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
  
          const useremail = teachers.email;
          const user = await usersCollection.findOne({ email: useremail, role: "admin" });
          if (user) {
            const query = { _id: new ObjectId(id) };
            const update = { $set: newData };
            const result = await teacherCollection.updateOne(query, update);
            res.send(result);
          } else {
            return res.send({ status: "error", data: "User is not a teacher" });
          }
        } catch (error) {
          console.error(error);
          return res.send({ status: "error", data: error.message });
        }
      });
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
      //get all students
  
      app.get('/allstudents', async (req, res) => {
        const token = req.headers.token;
        try {
          const students = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, res) => {
            if (err) {
              return "token expired";
            }
            return res;
          });
          if (students == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
          const result = await studentCollection.find().toArray();
          res.send(result);
        } catch (error) {
  
        }
  
      });
  
  
      //get all students
  
      app.get('/allstudents/:id', async (req, res) => {
        const token = req.headers.token;
        try {
          const students = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, res) => {
            if (err) {
              return "token expired";
            }
            return res;
          });
          if (students == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
          const id = req.params.id;
          const query = { _id: new ObjectId(id) }
          const result = await studentCollection.findOne(query);
          res.send(result);
        } catch (error) {
  
        }
  
      });
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
      app.get("/admin", async (req, res) => {
        const token = req.headers.token;
  
        try {
          const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, res) => {
            if (err) {
              return "token expired";
            }
            return res;
          });
          if (user == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
          const useremail = user.email;
  
          // if (req.decoded.email !== email) {
          //   res.send({ admin: false })
          // }
          const founduser = await usersCollection.findOne({ email: useremail }, { projection: { password: 0 } });
          if (founduser?.role === 'admin') {
            res.send(true)
          }
          else {
            res.send(false)
          }
          // const result = { admin: founduser?.role === 'admin' }
          // res.send(result);
  
        } catch (error) { }
      });
  
  
  
      // check admin
      app.get('/users/admin/:email', verifyJWT, async (req, res) => {
        const email = req.params.email;
  
        if (req.decoded.email !== email) {
          res.send({ admin: false })
        }
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        const result = { admin: user?.role === 'admin' }
        res.send(result);
      })
  
  
  
  
  
  
  
      app.post("/subject", async (req, res) => {
        const subject = req.body;
        const query = { subjectCode: subject.subjectCode }
        const existingSubject = await subjectCollection.findOne(query);
        if (existingSubject) {
          return res.send({ error: "Subject Exists" });
        }
        const result = await subjectCollection.insertOne(subject);
        res.send(result);
      });
  
  
  
  
  
  
  
  
  
      //get all subject
  
      app.get('/allsubjects', async (req, res) => {
        const token = req.headers.token;
        try {
          const subjects = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, res) => {
            if (err) {
              return "token expired";
            }
            return res;
          });
          if (subjects == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
          const result = await subjectCollection.find().toArray();
          res.send(result);
        } catch (error) {
  
        }
  
      });
  
  
  
  
  
  
  
  
      //get sub by id
  
      app.get('/subject/:id', async (req, res) => {
        const token = req.headers.token;
        try {
          const subject = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, res) => {
            if (err) {
              return "token expired";
            }
            return res;
          });
          if (subject == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
          const id = req.params.id;
          const query = { _id: new ObjectId(id) }
          const result = await subjectCollection.findOne(query);
          res.send(result);
        } catch (error) {
  
        }
  
      });
  
  
  
  
  
      app.put('/subject/:id', async (req, res) => {
        const token = req.headers.token;
        const id = req.params.id;
        const newData = req.body;
  
        try {
          const users = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
              return "token expired";
            }
            return decoded;
          });
          if (users == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
  
          const useremail = users.email;
          const user = await usersCollection.findOne({ email: useremail, role: "admin" });
          if (user) {
            const query = { _id: new ObjectId(id) };
            const update = { $set: newData };
            const result = await subjectCollection.updateOne(query, update);
            res.send(result);
          } else {
            return res.send({ status: "error", data: "User is not a teacher" });
          }
        } catch (error) {
          console.error(error);
          return res.send({ status: "error", data: error.message });
        }
      });
  
  
  
  
      app.put('/user/:id', async (req, res) => {
        const token = req.headers.token;
        const id = req.params.id;
        const newData = req.body;
  
        try {
          const users = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
              return "token expired";
            }
            return decoded;
          });
          if (users == "token expired") {
            return res.send({ status: "error", data: "token expired" });
          }
  
          const useremail = users.email;
          const user = await usersCollection.findOne({ email: useremail, role: "admin" });
          if (user) {
            const query = { _id: new ObjectId(id) };
            const update = { $set: newData };
            const result = await usersCollection.updateOne(query, update);
            res.send(result);
          } else {
            return res.send({ status: "error", data: "User is not a teacher" });
          }
        } catch (error) {
          console.error(error);
          return res.send({ status: "error", data: error.message });
        }
      });
  
  
  
  
  
  
  
  
  
  
      //here
  
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
    }
  }

app.get('/', (req, res) => {
    res.send('doctor is running')
})

app.listen(port, () => {
    console.log(`Car Doctor Server is running on port ${port}`)
})