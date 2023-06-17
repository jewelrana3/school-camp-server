const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 4000;

// middleware
app.use(cors())
app.use(express.json());


const verifyJWT = (req,res,next)=>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error:true,message:'Unauthorization access'})
  }
  // beear
  const token = authorization.split(' ')[1]
  jwt.verify(token,process.env.ACCESS_TOKEN_JWT,(err,decoded)=>{
    if(err){
      return res.status(403).send({error:true,message:'Unauthorization access not verify'})
    }
    req.decoded = decoded;
    next()
  })
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
    await client.connect();

    const popularCollection = client.db("schoolCamp").collection("popular");
    const instructorCollection = client.db("schoolCamp").collection("instructor");
    const cartCollection = client.db("schoolCamp").collection("cart");

    app.post('/jwt',(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_JWT,{
        expiresIn:'10d'
      })
      res.send({token})
    })

    app.get('/popular',async(req,res)=>{
        const result = await popularCollection.find().toArray()
        res.send(result)
    });

    app.get('/instructor',async(req,res)=>{
        const result = await instructorCollection.find().toArray()
        res.send(result)
    })
    // cart api
    app.get('/cart',verifyJWT,async(req,res)=>{
      const email = req.query.email;
      console.log('email',email)
      if(!email){
       return res.send([])
      }

      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error:true,message:'forbiden access'})
      }
      
      const query = {email : email}
      const result = await cartCollection.find(query).toArray()
      console.log('result',result)
      res.send(result)
    })

    app.post('/cart',async(req,res)=>{
        const item = req.body;
        const result = await cartCollection.insertOne(item)
        res.send(result)
    })

    app.delete('/cart/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)};
      const result = await cartCollection.deleteOne(query);
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


app.get('/',(req,res)=>{
    res.send('server start now')
});

app.listen(port,()=>{
    console.log(`server side is runing,${port}`)
})