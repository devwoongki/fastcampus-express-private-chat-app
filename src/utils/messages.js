const messageModel = require("../models/messages.model");

const getToken = (sender, receiver) => {
    const key = [sender, receiver].sort().join("_");
    return key;
}

const saveMessages = async ({from, to , message, time}) => {
    const token = getToken(from, to);
    const data = {
        from, message, to
    }

    messageModel.updateOne({userToken: token}, {
        $push: {message : data}
    }).then((err, res) => {
        if(err) console.error(err);
        console.log('message saved')
    })
}

const fetchMessages = async (io, sender, receiver) => {
    const token = getToken(sender, receiver);
    const foundToken = await messageModel.findOne({userToken: token});
    if(foundToken){
        io.to(sender).emit('stored-messages', {messages : foundToken.messages});
    }else{
        const data = {
            userToken : token,
            messages : []
        }

        const message = new messageModel(data);
        const savedMessasge = message.save();
        if(savedMessasge){
            console.log('message saved')
        }else{
            console.log('message not saved')
        }
    }
}

module.exports = {saveMessages , fetchMessages};