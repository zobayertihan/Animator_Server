const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ilc8iz8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.use(cors());
app.use(express.json());


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized Access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const serviceCollection = client.db('Animator').collection('services');
        const reviewCollection = client.db('Animator').collection('reviews');

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            })
            res.send({ token });
        })

        app.get('/services', async (req, res) => {
            const query = {}
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            // limit(3) 
            res.send(services);
        });

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await serviceCollection.findOne(query);
            res.send(service);
        });

        app.post('/services', async (req, res) => {
            const service = req.body;
            const result = await serviceCollection.insertOne(service);
            res.send(result);
        })



        app.get('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { ServiceId: id };
            const service = await reviewCollection.find(query);
            console.log(service)
            res.send(service);
        });

        // app.get('/reviews', async (req, res) => {
        //     let query = {}
        //     const cursor = reviewCollection.find(query);
        //     const reviews = await cursor.toArray();
        //     res.send(reviews);
        // });

        app.get('/reviews', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            let query = {}
            const cursor = reviewCollection.find(query).sort({ reviewTime: -1 });
            const reviews = await cursor.toArray();
            if (decoded?.email !== req.query.email) {
                res.status(403).send({ message: 'Unauthorized Access' });
            }
            res.send(reviews);
        });

        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })


        app.delete('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { ServiceId: id };
            const result = await reviewCollection.deleteOne(query);
            res.send(result);
        })


        app.patch('/reviews/:id', async (req, res) => {
            const decoded = req.decoded;
            console.log('inside orders api', decoded);
            if (decoded.email !== req.query.email) {
                res.status(403).send({ message: 'Unauthorized Access' });
            }
            const id = req.params.id;
            const status = req.body.status;
            const query = { ServiceId: id };
            const updatedDoc = {
                $set: {
                    status: status
                }
            }
            const result = await reviewCollection.updateOne(query, updatedDoc);
            res.send(result);
        })



    }
    finally {

    }
}

run().catch(e => console.error(e));


app.get('/', (req, res) => {
    res.send('Animator Server Running')
})

app.listen(port, () => {
    console.log(`Animator Loading on port: ${port}`);
})