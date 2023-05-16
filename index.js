const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())

console.log(process.env.JiniourCar_Pass)

const uri = `mongodb+srv://${process.env.JiniourCar_User}:${process.env.JiniourCar_Pass}@cluster0.sjxouxn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization
    if(!authorization){
        return res.status(401).send({error: true, messege: 'unauthorized access'})
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.SECRET_ACCESS_TOKEN, (error, decoded) => {
        if(error){
            return res.status(403).send({error: true, messege: 'unauthorized access'})
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db('jiniousCar').collection('services')
        const bookingCollection = client.db('jiniousCar').collection('bookings')

        // jwt 
        app.post('/jwt', (req, res) => {
            const user = req.body;
            console.log(user)
            const token = jwt.sign(user, process.env.SECRET_ACCESS_TOKEN, { expiresIn : '1h'})
            res.send({token})
        })

        // services routes
        app.get('/services', async(req, res) => {
            const cursor = serviceCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/services/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id : new ObjectId(id)}
            const result = await serviceCollection.findOne(query)
            res.send(result);
        })

        // bookings...

        app.get('/booking', verifyJwt, async(req, res) => {
            // console.log(req.headers.authorization)
            const decoded = req.decoded
            console.log('come back after verify', decoded)
            if(decoded.email !== req.query.email){
                return res.send({error: 1, messege: 'forbidden access'})
            }
            let query = {}
            if(req.query?.email){
                query = {email : req.query.email}
            }
            const result = await bookingCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/booking', async(req, res) =>{
            const booking = req.body;
            console.log(booking)
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })

        app.patch('/booking/:id', async(req, res) => {
            const id = req.params.id
            const filter = {_id : new ObjectId(id)}
            const updateBooking = req.body;
            console.log(updateBooking)
            const updateStatus = {
                $set: {
                    status : updateBooking.status
                }
            }
            const result = await bookingCollection.updateOne(filter, updateStatus)
            res.send(result)
        })

        app.delete('/booking/:id', async(req, res)=> {
            const id = req.params.id;
            const query = {_id : new ObjectId(id)}
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })

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
    res.send('Jinious car is running')
})

app.listen(port, () => {
    console.log(`jinious car is running on port: ${port}`)
})