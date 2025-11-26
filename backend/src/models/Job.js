const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  description: String,
  
  
  tags: [String], 
  
  externalId: { type: String, unique: true }, 
  
  source: { type: String, required: true },
  
  applyLink: { type: String, required: true },
  
  postedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', JobSchema);