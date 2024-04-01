// Later this will not be an array it will be the actual mode
// connected to a database

// aka fruits model
const mongoose = require('mongoose');
const fruitSchema = new mongoose.Schema({
    name: {type: String, required: true},
    color: {type:String},
    readyToEat: {type: Boolean},
    user: { type: mongoose.Types.ObjectId, ref: 'User'}
})


module.exports = mongoose.model("Fruit", fruitSchema)


