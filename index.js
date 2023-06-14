const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 4000;

// middle ware
app.use(cors())
app.use(express.json())

app.get('/',(req,res)=>{
    res.send('start now')
})

app.listen(port,()=>{
    console.log(`server is runnig,${port}`)
})