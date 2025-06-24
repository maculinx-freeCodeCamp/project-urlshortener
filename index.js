require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');

// Basic Configuration
const port = process.env.PORT;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema;
// Schemi
const counterSchema = new Schema({
  _id: String,          // nome della sequenza (es: 'url_count')
  seq: { type: Number, default: 0 }
});
const urlSchema = new Schema({
  original_url : { type: String, required: true },
  short_url: Number
});

// Modello per il contatore
const Counter = mongoose.model('Counter', counterSchema);

// Middleware
urlSchema.pre('save', async function (next) {
  const doc = this;

  if (doc.short_url != null) return next(); // già assegnato

  try {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'url_count' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    doc.short_url = counter.seq;
    next();
  } catch (err) {
    next(err);
  }
});

// Modello per gli URL
const Url = mongoose.model('Url', urlSchema);


app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));


//API Endpoints

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', async (req, res) => {
  const original_url = req.body.url;

  if (!original_url.includes('http://') && !original_url.includes('https://')) {
    return res.json({ error: 'Invalid URL' });
  }

  try {
    const newUrl = new Url({ original_url });
    await newUrl.save();
    res.json({ original_url, short_url: newUrl.short_url });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

app.get('/api/shorturl/:id', async (req, res) => {
  try {
    const urlEntry = await Url.findOne({ short_url: parseInt(req.params.id) });

    if (urlEntry) {
      res.redirect(urlEntry.original_url);
    } else {
      res.status(404).json({ error: 'URL not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

