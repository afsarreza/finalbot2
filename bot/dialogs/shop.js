var util = require('util');
var builder = require('botbuilder');

var lib = new builder.Library('shop');
lib.dialog('/', [
    function(session){
    builder.Prompts.text(session,"Sure! What do you want to buy?")
    },
    function (session) {
        session.dialogData.msg = session.message.text
       session.beginDialog('product-selection:/')
    },
    function (session, args,next) {
        session.dialogData.selection = args.selection;
        next()
    },
    function (session, args) {
        // Continue to checkout
        var order = {
            selection: session.dialogData.selection
        };

        console.log('order', order);
        session.beginDialog('checkout:/', { order: order });
    }
]);

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};
