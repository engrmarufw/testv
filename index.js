const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;
const bcrypt = require('bcrypt');

// middleware
app.use(cors());
app.use(express.json());



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
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db('carDoctor').collection('services');
        const bookingCollection = client.db('carDoctor').collection('bookings');
        const usersCollection = client.db("mmanageDB").collection("users");

        app.get('/allusers', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
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


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('doctor is running')
})

app.listen(port, () => {
    console.log(`Car Doctor Server is running on port ${port}`)
})