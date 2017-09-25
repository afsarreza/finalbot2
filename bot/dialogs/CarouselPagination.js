var builder = require('botbuilder');
var Client = require('node-rest-client').Client;
var solr = require('solr-client');

var client = new Client();

var client1 = solr.createClient('54.158.112.215', '8080', 'ecommerce_1');

var defaultSettings = {
    showMoreTitle: 'title_show_more',
    showMoreValue: 'show_more',
    selectTemplate: 'select',
    pageSize: 10,
    unknownOption: 'unknown_option'
};
module.exports = {
    create: function (getPageFunc, getItemFunc, itemToCardFunc, settings) {
        // parameter validation
        settings = Object.assign({}, defaultSettings, settings);
        if (typeof getPageFunc !== 'function') {
            throw new Error('getPageFunc must be a function');
        }

        if (typeof getItemFunc !== 'function') {
            throw new Error('getItemFunc must be a function');
        }

        if (typeof itemToCardFunc !== 'function') {
            throw new Error('itemToCardFunc must be a function');
        }

        // map item info into HeroCard
        var asCard = function (session, cardInfo) {
            var card = new builder.HeroCard()
                .title(cardInfo.title)
                .buttons([
                    new builder.CardAction()
                        .type('imBack')
                        .value(session.gettext(settings.selectTemplate) + cardInfo.title)
                        .title(session.gettext(cardInfo.buttonLabel))
                ]);

            if (cardInfo.subtitle) {
                card = card.subtitle(cardInfo.subtitle);
            }

            if (cardInfo.imageUrl) {
                card = card.images([new builder.CardImage().url(cardInfo.imageUrl).alt(cardInfo.title)]);
            }

            return card;
        };

        // return dialog handler funciton
        return  function (session, args, next) {
            var pageNumber = session.dialogData.pageNumber || 1;
            var input = session.message.text;
            var selectPrefix = session.gettext(settings.selectTemplate);
            if (input && input.toLowerCase() === session.gettext(settings.showMoreValue).toLowerCase()) {
                // next page
                pageNumber++;
            } else if (input && isSelection(input, selectPrefix)) {
                // Validate selection
                var selectedName = input.substring(selectPrefix.length);
                getItemFunc(selectedName).then(function (selectedItem) {
                    
                    if (!selectedItem) {
                        return session.send(settings.unknownOption);
                    }

                    // reset page
                    session.dialogData.pageNumber = null;

                    // return selection to dialog stack
                    return next({ selected: selectedItem });
                });

                return;
            }
            else if (session.message.text){
                //session.send(session.dialogData.allProducts)
                return session.beginDialog('/')
            }
            else if (session.message.value){
                function getSearchQuery(){
                    //session.send("ITS BEGINNIG HEREEEEEEEeee"),
                    allProducts=[]
                    url_te = "http://34.201.62.199:7777/nlpapi/tri?text=" + session.message.text;
                    search_qry=[]
                    var args =
                    {
                        data: { test: "hello" },
                        headers: { "Content-Type": "application/json" }
                    };
                    var client = new Client();
                    client.post
                    (url_te, args, function (data, response) {
                        // console.log("The length of the variable data is " + data.length);
                        //Handles when triple extarction yields null results
                        if (data.length == 0) {
                            search_qry.push(session.message.text);
                            // session.send("You wanted to buy " + msg + ". Here are the results." + search_qry);
                        }
                
                        //Handles when triple extraction yields results
                        else {
                            reslen = Object.keys(data).length;
        
                            for (var i = 0; i < reslen; i++) {
                                search_qry.push(data[i]['object']);
                            }
                            //console.log(search_qry);
                        }
                        search_qry = session.dialogData.search_qry
                        final1()   
                    })
                    
                }
                function final2(){
                    //console.log("I AM HERE FINAL22")
                    //console.log(query)
                    client1.search
                    (getQuery(search_qry), function (err, obj) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            resultsobj = obj.response;                       
                            for(var i =0; i < resultsobj.numFound; i++){
                                allProducts.push({
                                    name:resultsobj.docs[i].title.toString(),
                                    // name:"Algonox Product " + i,
                                    imageUrl:'',
                                    price:parseFloat((resultsobj.docs[i]['formattedPrice']).slice(1)),
                                })
                            }
                            final3()
                        }
                    })
                }
                function final1(){
                    query = getQuery(search_qry)
                    final2()
                }
                function final3(){
                    session.dialogData.allProducts=allProducts

                    // retrieve from service and send items
            getPageFunc(pageNumber, settings.pageSize).then(function (pageResult) {
                // save current page number
                session.dialogData.pageNumber = pageNumber;

                // items carousel
                var cards = pageResult.items
                    .map(itemToCardFunc)
                    .map(function (cardData) { return asCard(session, cardData); });
                var message = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(message);

                // more items link
                if (pageResult.totalCount > pageNumber * settings.pageSize) {
                    var moreCard = new builder.HeroCard(session)
                        .title(settings.showMoreTitle)
                        .buttons([
                            builder.CardAction.imBack(session, session.gettext(settings.showMoreValue), settings.showMoreValue)
                        ]);
                    session.send(new builder.Message(session).addAttachment(moreCard));
                }


                var msg = new builder.Message(session).addAttachment({
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content:{
                        "type": "AdaptiveCard",
                        "version": "0.5",
                        "body": [
                            {
                                "type":"TextBlock",
                                "text":"Specifications",
                                "weight":"bolder"
                            },
                            {
                                "type": "Input.ChoiceSet",
                                "id": "myColor",
                                "style": "compact",
                                "placeholder":"Choose Color",
                                "isMultiSelect": false,
                                "choices":[
                                    {
                                        "title": "Red",
                                        "value": "Red"
                                    },
                                    {
                                        "title": "Black",
                                        "value": "Black"
                                    },
                                    {
                                        "title": "Green",
                                        "value": "Green"
                                    }
                                ]
                            
                            },
                             {
                                "type": "Input.Toggle",
                                "id": "IsSale",
                                "title": "Sale?",
                                "valueOn": "true",
                                "valueOff": "false"
                            
                            },
                           
                            {
                                "type": "Input.Toggle",
                                "id": "IsReturnPolicy",
                                "title": "ReturnPolicy?",
                                "valueOn": "true",
                                "valueOff": "false"
                            
                            }
                            ],
                            
                        "actions": [
                            {
                                "type": "Action.Submit",
                                "title": "Search",
                                "data": {
                                    
                                }            
                            }
                        ]
                    }
                })
                session.send(msg)
            });
















                }
                function getQuery(search_qry) {
                   // var client = solr.createClient('54.158.112.215','8080','ecommerce_1');
                   // search_qry = ["shoes","shirts"]
                    
                    //True coonversion of array into string
                    console.log(search_qry)
                    stringsearched = JSON.stringify(search_qry);
                    
                    //stringsearched=[]
                    // console.log(typeof(stringsearched))
                    // console.log("The string searched is " + stringsearched)
                    
                    inko = search_qry.toString();
                    console.log("jhdvsjvs" + inko)

                    filterobj = session.message.value;
                    
                    if(filterobj.myColor === "")
                    {
                        filterobj.myColor = "*";
                    }
                    
                    //For manipulating sale filter
                    if (filterobj.IsSale === "true")
                    {
                        filterobj.IsSale = 'y'
                    }
                    else if(filterobj.IsSale === "false")
                    {
                        filterobj.IsSale = 'n'
                    }
                    
                    //For manipulating returnpolicy filter
                    if (filterobj.IsReturnPolicy === "true")
                    {
                        filterobj.IsReturnPolicy = 'y'
                    }
                    else if(filterobj.IsReturnPolicy === "false")
                    {
                        filterobj.IsReturnPolicy = 'n'
                    }
                    
                
                    var query = client1.query().q({title:inko}).matchFilter('color',filterobj.myColor).matchFilter('sale',filterobj.IsSale).matchFilter('isReturnPolicy',filterobj.IsReturnPolicy).start(0).rows(10000)
        
                    console.log(query)
                    
                    return (query)
}
                getSearchQuery()
            }

            // retrieve from service and send items
            getPageFunc(pageNumber, settings.pageSize).then(function (pageResult) {
                // save current page number
                session.dialogData.pageNumber = pageNumber;

                // items carousel
                var cards = pageResult.items
                    .map(itemToCardFunc)
                    .map(function (cardData) { return asCard(session, cardData); });
                var message = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(message);

                // more items link
                if (pageResult.totalCount > pageNumber * settings.pageSize) {
                    var moreCard = new builder.HeroCard(session)
                        .title(settings.showMoreTitle)
                        .buttons([
                            builder.CardAction.imBack(session, session.gettext(settings.showMoreValue), settings.showMoreValue)
                        ]);
                    session.send(new builder.Message(session).addAttachment(moreCard));
                }


                var msg = new builder.Message(session).addAttachment({
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content:{
                        "type": "AdaptiveCard",
                        "version": "0.5",
                        "body": [
                            {
                                "type":"TextBlock",
                                "text":"Specifications",
                                "weight":"bolder"
                            },
                            {
                                "type": "Input.ChoiceSet",
                                "id": "myColor",
                                "style": "compact",
                                "placeholder":"Choose Color",
                                "isMultiSelect": false,
                                "choices":[
                                    {
                                        "title": "Red",
                                        "value": "Red"
                                    },
                                    {
                                        "title": "Black",
                                        "value": "Black"
                                    },
                                    {
                                        "title": "Green",
                                        "value": "Green"
                                    }
                                ]
                            
                            },
                             {
                                "type": "Input.Toggle",
                                "id": "IsSale",
                                "title": "Sale?",
                                "valueOn": "true",
                                "valueOff": "false"
                            
                            },
                           
                            {
                                "type": "Input.Toggle",
                                "id": "IsReturnPolicy",
                                "title": "ReturnPolicy?",
                                "valueOn": "true",
                                "valueOff": "false"
                            
                            }
                            ],
                            
                        "actions": [
                            {
                                "type": "Action.Submit",
                                "title": "Search",
                                "data": {
                                    
                                }            
                            }
                        ]
                    }
                })
                session.send(msg)
            });
        };
    }
};

function isSelection(input, selectPrefix) {
    return input.toLowerCase().indexOf(selectPrefix.toLowerCase()) === 0;
}
