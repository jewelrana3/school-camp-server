const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const cors = require('cors');
const port = process.env.PORT || 4000;

// middleware
app.use(cors())
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorization access he' })
  }
  // beear
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_JWT, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: 'Unauthorization access not verify' })
    }
    req.decoded = decoded;
   
  })
  next()
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cnbwwnw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    
  
    const addclassCollection = client.db("schoolCamp").collection("addclass");
    const usersCollection = client.db("schoolCamp").collection("users");
    const popularCollection = client.db("schoolCamp").collection("popular");
    const instructorCollection = client.db("schoolCamp").collection("instructor");
    const cartCollection = client.db("schoolCamp").collection("carts");
    const paymentCollection = client.db("schoolCamp").collection("payment");
    const feadbackCollection = client.db("schoolCamp").collection("feadbackCollection");
    

    // jwt 
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_JWT, {
        expiresIn: '7d'
      })
      res.send({ token })
    })

    // admin verify
    const verifyAdmin = async(req,res,next)=>{
      const email = req.decoded.email
      const query = {email:email}
      const user = await usersCollection.findOne(query)
      if(user?.role !== 'admin' ){
        return res.status(401).send({error:true ,message:'forbidden access'})
      }
      next()
    }

    // instructor verify
    const verifyInstructor = async(req,res,next)=>{
      const email = req.decoded.email
      const query = {email:email}
      const user = await usersCollection.findOne(query)
      if(user?.role !== 'instructor'){
        return res.status(403).send({error:true,message:'forbidden access'})
      }
      next()
    }

    // admin secure
    app.get('/users/admin/:email',verifyJWT,async(req,res)=>{
      const email = req.params.email
      if(req.decoded.email !== email){
        return res.send({admin:false})
      }
      const query = { email:email}
      const user = await usersCollection.findOne(query)
      const result = { admin : user?.role === 'admin'}
      res.send(result)
    })

    // instructor secure
    app.get('/users/instructor/:email',verifyJWT,async(req,res)=>{
      const email = req.decoded.email
      if(req.decoded.email !== email){
        return res.send({ admin : false})
      }
      const query = {email : email}
      const user = await usersCollection.findOne(query)
      const result = {admin : user?.role === 'instructor'}
      res.send(result)
    })

    // all class
    app.get("/allClass", async (req, res) => {
      const result = await addclassCollection.find().toArray();
      if (!result) {
        res.status(401).send({ error: true, message: "not found" });
      }
      res.send(result);
    });

    // // aprove class
    // app.get('/classes',async(req,res)=>{
    //   const query = {status:'approved'}
    //   const result = await addclassCollection.find(query).toArray()
    //   if(!result){
    //     return res.status(401).send({error:true,message:'class not found'})
    //   }
    // })

    // add classes
    app.post('/addclass',verifyJWT,verifyInstructor,async(req,res)=>{
      const data = req.body
      if(!data){
        return res.send({message:'data not found'})
      }
      const result = await addclassCollection.insertOne(data)
      res.send(result)
    })

    // all users
    app.get('/users',async(req,res)=>{
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    // save user email and role in md
    app.post('/users', async (req, res) => {
      const user = req.body
      const query = {email:user?.email}

      const extingUser = await usersCollection.findOne(query)

      if(extingUser){
        return res.send({message:'already user'})
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

   

    app.get('/popular', async (req, res) => {
      const result = await popularCollection.find().sort({students:-1}).toArray()
      res.send(result)
    });

    app.get('/popular/:id', async (req, res) => {
      const id = req.params.id
      const result = await popularCollection.findOne({ _id: new ObjectId(id) })
      res.send(result)
    });
   

    

    app.get('/instructor', async (req, res) => {
      const query={role:"instructor"}
      const result = await usersCollection.find(query).sort({students:-1}).toArray()
      res.send(result)
    })
   

    

    // cart api
    app.get('/carts',verifyJWT, async (req, res) => {
      const email = req.query.email;
    
      if (!email) {
         res.send([])
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbiden access' })
      }
      const query = { email: email }
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item)
      res.send(result)
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result)
    });

    // payment create api
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body
      const amount = price * 100
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']

      });
      res.send({ clientSecret: paymentIntent.client_secret })
    })

    //  payment api releted
    app.get('/payment', async (req, res) => {
      const result = await paymentCollection.find().toArray()
      res.send(result)
    })

    app.post('/payment', verifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);

      const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
      const deleteItems = await cartCollection.deleteOne(query)
      res.send({ result, deleteItems })
    })

    // feadback side
    app.post('/feadbackCollection',async(req,res)=>{
      const data = req.body
      const result = await feadbackCollection.insertOne(data)
      res.send(result)
    })

    // make instructor
    app.patch('/makeInstructor/:id',verifyJWT,verifyAdmin,async(req,res)=>{
      const id = req.params.id
      const filter = {_id:new ObjectId(id)}
      const updateDoc = {
        $set:{
          role:'instructor'
        }
      }
      const result = await usersCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    // make admin 
    app.patch('/makeAdmin/:id',verifyJWT,verifyAdmin,async(req,res)=>{
      const id = req.params.id
      const filter = {_id:new ObjectId(id)}
      const updateDoc = {
        $set:{
          role:'admin'
        }
      }
      const result = await usersCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    // approve update
    app.patch('/approved/:id',verifyJWT,verifyAdmin,async(req,res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set:{
          status:'approved'
        }
      }
      const result = await addclassCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    // denied
    app.patch('/denied/:id',verifyJWT,verifyAdmin,async(req,res)=>{
      const id = req.params.id
      const query = {_id:new ObjectId(id)}
      const updateDoc = {
        $set:{
          status:'denied'
        }
      }
      const result = await addclassCollection.updateOne(query,updateDoc)
      res.send(result)
    })






    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('server start now')
});

app.listen(port, () => {
  console.log(`server side is runing,${port}`)
})