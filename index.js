const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 9000
const app = express()
const cookieParser = require('cookie-parser')
const corsOptions = {
  // origin: ['http://localhost:5173'],
  credentials: true,
  optionalSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gsnwc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
// verifyToken
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).send({ message: 'unauthorized access' })
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
  })

  next()
}

async function run() {
  try {
    const db = client.db('MerathonCOllection')
    const MerathonCOllection = db.collection('Merathon')
    const registerCollection = db.collection('registermerathon')
   

    // generate jwt
    app.post('/jwt', async (req, res) => {
      const email = req.body
      // create token
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: '365d',
      })
      console.log(token)
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // logout || clear cookie from browser
    app.get('/logout', async (req, res) => {
      res
        .clearCookie('token', {
          maxAge: 0,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // // save a jobData in db
    app.post('/addmerathon', async (req, res) => {
      const merathonData = req.body
      const result = await MerathonCOllection.insertOne(merathonData)
      console.log(result)
      res.send(result)
    })

    app.get('/marathonss', async (req, res) => {
      const { createdBy } = req.query;  // এখানে createdBy আসছে কিনা চেক করো
  
      const marathons = await MerathonCOllection.find({ createdBy }).toArray();
      res.send(marathons);
  });
  

    // // get all jobs data from db
    app.get('/marathons', async (req, res) => {
      const result = await MerathonCOllection.find().toArray()
      res.send(result)
    })

    
    // // delete a job from db
    app.delete('/marathons/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await MerathonCOllection.deleteOne(query)
      res.send(result)
    })

    app.get('/marathon/:id', async (req, res) => {
        const id = req.params.id
        const query = { _id: new ObjectId(id) }
        const result = await MerathonCOllection.findOne(query)
        res.send(result)
      })

      const { ObjectId } = require('mongodb');

app.put('/marathons/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { _id, ...merathonData } = req.body; // _id ফিল্ড বাদ দিয়ে বাকি ডাটা নিন

        const query = { _id: new ObjectId(id) };
        const updated = { $set: merathonData };
        const options = { upsert: true };

        const result = await MerathonCOllection.updateOne(query, updated, options);
        console.log(result);
        res.send(result);
    } catch (error) {
        console.error('Error updating marathon:', error);
        res.status(500).send({ message: 'Internal Server Error', error });
    }
});



    // app.put('/marathons/:id', async (req, res) => {
    //     const id = req.params.id
    //     const merathonData = req.body
    //     const updated = {
    //       $set: merathonData,
    //     }
    //     const query = { _id: new ObjectId(id) }
    //     const options = { upsert: true }
    //     const result = await MerathonCOllection.updateOne(query, updated, options)
    //     console.log(result)
    //     res.send(result)
    //   })

    // // get a single job data by id from db
    app.get('/marathon/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await MerathonCOllection.findOne(query)
      res.send(result)
    })


    app.post('/register', async (req, res) => {
      try {
          console.log("Received Data:", req.body);
  
          const { marathonId } = req.body;
  
          if (!ObjectId.isValid(marathonId)) {
              res.send({ message: "Invalid marathonId" });
              return;
          }
  
          // ✅ রেজিস্ট্রেশন ইনসার্ট করা
          const insertResult = await registerCollection.insertOne(req.body);
          console.log("Insert Result:", insertResult);
  
          if (!insertResult.acknowledged) {
              res.send({ message: "Failed to insert registration" });
              return;
          }
  
          // ✅ মোট রেজিস্ট্রেশন সংখ্যা ১ বাড়ানো
          const updatedMarathon = await MerathonCOllection.findOneAndUpdate(
              { _id: new ObjectId(marathonId) },
              { $inc: { totalRegistrations: 1 } },
              { returnDocument: 'after' }
          );
  
          console.log("Updated Marathon:", updatedMarathon);
  
          if (!updatedMarathon.value) {
              res.send({ message: "Marathon not found" });
              return;
          }
  
          res.send({ 
              message: 'Registration successful', 
              updatedTotal: updatedMarathon.value.totalRegistrations 
          });
  
      } catch (error) {
          console.error('Registration Error:', error);
          res.send({ message: 'Registration failed', error: error.message });
      }
  });
  



  //   app.post('/register', async (req, res) => {
  //     try {
  //         const { marathonId, email, firstName, lastName, contactNumber, additionalInfo, selectedDate } = req.body;
  
  //         console.log("Received Data:", req.body); // ✅ ডাটা চেক
  
  //         if (!ObjectId.isValid(marathonId)) {
  //             return res.status(400).json({ message: "Invalid marathonId" });
  //         }
  
  //         // ✅ নতুন রেজিস্ট্রেশন তৈরি করা
  //         const newRegistration = req.body
  //         const insertResult = await registerCollection.insertOne(newRegistration);
  //         console.log("new registration",newRegistration)
  //         res.send(newRegistration)
         
  
  //         // ✅ মোট রেজিস্ট্রেশন সংখ্যা ১ বাড়ানো
  //         const updatedMarathon = await MerathonCOllection.findOneAndUpdate(
  //             { _id: new ObjectId(marathonId) },
  //             { $inc: { totalRegistrations: 1 } },
  //             { returnDocument: 'after' }
  //         );
  
  //         if (!updatedMarathon.value) {
  //             return res.status(404).json({ message: "Marathon not found" });
  //         }
  
  //         res.status(200).json({ 
  //             message: 'Registration successful', 
  //             updatedTotal: updatedMarathon.value.totalRegistrations 
  //         });
  
  //     } catch (error) {
  //         console.error('Registration Error:', error);
  //         res.status(500).json({ message: 'Registration failed', error: error.message });
  //     }
  // });
  
    
    

    
      // app.post('/register', async (req, res) => {
      //   const merathonData = req.body
      //   const result = await registerCollection.insertOne(merathonData)
      //   console.log(result)
      //   res.send(result)
      // })

      app.get('/register', async (req, res) => {
        const result = await registerCollection.find().toArray()
        res.send(result)
      })


      app.get('/dashboard', async (req, res) => {
        const result = await registerCollection.find().toArray()
        res.send(result)
      })

      app.get('/marathon/:id', async (req, res) => {
        const id = req.params.id
        const query = { _id: new ObjectId(id) }
        const result = await registerCollection.findOne(query)
        res.send(result)
      })


      app.delete('/regimerathon/:id', async (req, res) => {
        const id = req.params.id
        const query = { _id: new ObjectId(id) }
        const result = await registerCollection.deleteOne(query)
        res.send(result)
      })


      app.put('/regimerathon/:id', async (req, res) => {
        const id = req.params.id
        const merathonData = req.body
        const updated = {
          $set: merathonData,
        }
        const query = { _id: new ObjectId(id) }
        const options = { upsert: true }
        const result = await registerCollection.updateOne(query, updated, options)
        console.log(result)
        res.send(result)
      })


      app.get('/dashboard/:email', async (req, res) => {
        const email = req.params.email;
        const search = req.query.search || ''; // Extract search query parameter from the URL
    
        try {
            // Create the query object to match the email
            let query = { email };
    
            // If search parameter is provided, extend the query
            if (search) {
                // You can modify the query to match documents based on the search term
                // Here we assume 'title' is the field you're searching in, but you can adjust it
                query = {
                    ...query,
                    title: { $regex: search, $options: 'i' } // case-insensitive search
                };
            }
    
            // Fetch data from the database
            const result = await registerCollection.find(query).toArray(); // Convert cursor to an array
    
            // Check if data exists
            if (result && result.length > 0) {
                res.status(200).send(result); // Send matching documents
            } else {
                res.status(404).send({ message: "No registrations found" }); // Send an error message if no results
            }
        } catch (error) {
            console.error("Error fetching registration data:", error);
            res.status(500).send({ message: "Internal Server Error", error: error.message }); // Handle unexpected errors
        }
    });
    


    app.get('/dashboar/:email', async (req, res) => {
        const email = req.params.email;
    
        // Query to match the email
        const query = { email };
    
        // Fetch data from the database
        const result = await registerCollection.find(query).toArray(); // Convert cursor to an array
    
        // Check if data exists
        if (result && result.length > 0) {
            res.send(result); // Send all matching documents
        } else {
            res.send([]); // Send an empty array if no match
        }
    });



// aetar kaj baki
    app.post('/merathon', async (req, res) => {
      try {
        const marathonData = req.body;
    
        // 0. যদি ব্যবহারকারী ইতিমধ্যেই এই ম্যারাথনে রেজিস্ট্রেশন করে থাকে
        const query = { email: marathonData.email, marathonId: marathonData.marathonId };
        const alreadyExist = await registerCollection.findOne(query);
        console.log('If already exist -->', alreadyExist);
        if (alreadyExist) {
          return res.status(400).json({ message: 'You have already registered for this marathon!' });
        }
    
        // 1. রেজিস্ট্রেশন ডেটা registerCollection-এ সংরক্ষণ করা
        const result = await registerCollection.insertOne(marathonData);
    
        // 2. ম্যারাথনের totalRegistrations সংখ্যা বৃদ্ধি করা
        const filter = { _id: new ObjectId(marathonData.marathonId) };
        const update = { $inc: { totalRegistrations: 1 } };
        const updateRegistrationCount = await MerathonCOllection.updateOne(filter, update);
        console.log('Registration Count Update -->', updateRegistrationCount);
    
        // সফল রেসপন্স
        res.status(200).json({ message: 'Registration successful!', result });
      } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Failed to register for the marathon!', error });
      }
    });




    

    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))