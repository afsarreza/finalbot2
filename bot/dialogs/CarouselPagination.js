var builder = require('botbuilder');
var Client = require('node-rest-client').Client;
var solr = require('solr-client');
var SolrQueryBuilder = require('solr-query-builder');
var SolrNode = require('solr-node');
var count = 0
var client = new Client();

var client1 = solr.createClient('54.158.112.215', '8080', 'ecommerce_2');
// var client1 = solr.createClient('localhost', '8983', 'ecommerce_2');

var defaultSettings = {
    showMoreTitle: 'title_show_more',
    showMoreValue: 'show_more',
    selectTemplate: 'select',
    pageSize: 10,
    unknownOption: 'unknown_option'
};
module.exports = {
    create: function (getPageFunc,getItemFunc, itemToCardFunc, settings) {
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
        return function (session, args, next) {
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
            //This is for the button functions in adaptive cards
            else if (session.message.value) {

                var filterobj1 = session.message.value
                console.log("This is for checking the new buttons babau" )
                console.log(filterobj1) 
                console.log("This is after checking the buttons session.message.value")

                //For incremental cards results
                if(filterobj1.opt === "Show more items")
                {
                    console.log("The show more button is success")
                    // session.send("The show more button is working");
                    // session.send("2nd time for show more items")
                    // pageNumber = 0
                    pageNumber = filterobj1.x +1;
                    console.log("The incremented page number for pageNumber is " + pageNumber)
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
                        // session.send("this is inside final 3 function with page number " + pageNumber)
                        // more items link
                        if (pageResult.totalCount > pageNumber * settings.pageSize) {
                            var moreCard = new builder.HeroCard(session)
                                .title(settings.showMoreTitle)
                                .buttons([
                                    builder.CardAction.postBack(session, session.gettext(settings.showMoreValue), settings.showMoreValue)
                                ]);
                            //session.send(new builder.Message(session).addAttachment(moreCard));
                             var msg = new builder.Message(session).addAttachment({
                            contentType: "application/vnd.microsoft.card.adaptive",
                            content: {
                                "type": "AdaptiveCard",
                                "version": "0.5",
                                "body": [
                                    {
                                        "type": "TextBlock",
                                        "text": "Specifications",
                                        "weight": "bolder"
                                    },
                                    {
                                        "type": "Input.ChoiceSet",
                                        "id": "myColor",
                                        "style": "compact",
                                        // "placeholder": "Choose Color",
                                        "value":"Choose Color",
                                        "isMultiSelect": false,
                                        "choices": [
                                            {   
                                                "title": "Choose Color",
                                                "value": "Choose Color"
                                            },
                                            {
                                                "title": "Gray",
                                                "value": "Gray"
                                            },
                                            {
                                                "title": "Black",
                                                "value": "Black"
                                            },
                                            {
                                                "title": "Brown",
                                                "value": "Brown"
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
                                        "title": "Return Policy?",
                                        "valueOn": "true",
                                        "valueOff": "false"

                                    }
                                ],

                                "actions": [
                                    {
                                        "type": "Action.Submit",
                                        "title": "Apply Filter",
                                        "data":{"opt":"Apply Filters"}
                                    },
                                    {
                                        "type": "Action.Submit",
                                        "title": "Show more results",
                                        "data":{"opt":"Show more items","x":pageNumber}
                                    },
                                    {
                                        "type": "Action.Submit",
                                        "title": "Shop Again",
                                        "data":{"opt":"Shop Again"}
                                    },
                                    {
                                        "type": "Action.Submit",
                                        "title": "Leave",
                                        "data":{"opt":"Leave"}
            
                                    }
                                ]
                            }
                        })
                        session.send(msg)
                        }


                        
                        else
                        {
                            session.send("You have reached end of the list")
                            var msg = new builder.Message(session).addAttachment({
                                contentType: "application/vnd.microsoft.card.adaptive",
                                content: {
                                    "type": "AdaptiveCard",
                                    "version": "0.5",
                                    "body": [
                                        {
                                            "type": "TextBlock",
                                            "text": "Specifications",
                                            "weight": "bolder"
                                        },
                                        {
                                            "type": "Input.ChoiceSet",
                                            "id": "myColor",
                                            "style": "compact",
                                            // "placeholder": "Choose Color",
                                            "value":"Choose Color",
                                            "isMultiSelect": false,
                                            "choices": [
                                                {   
                                                    "title": "Choose Color",
                                                    "value": "Choose Color"
                                                },
                                                {
                                                    "title": "Gray",
                                                    "value": "Gray"
                                                },
                                                {
                                                    "title": "Black",
                                                    "value": "Black"
                                                },
                                                {
                                                    "title": "Brown",
                                                    "value": "Brown"
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
                                            "title": "Return Policy?",
                                            "valueOn": "true",
                                            "valueOff": "false"
    
                                        }
                                    ],
    
                                    "actions": [
                                        {
                                            "type": "Action.Submit",
                                            "title": "Apply Filters",
                                            "data":{"opt":"Apply Filters"}
                                        },
                                        {
                                            "type": "Action.Submit",
                                            "title": "Shop Again",
                                            "data":{"opt":"Shop Again"}
                                        },
                                        {
                                            "type": "Action.Submit",
                                            "title": "Leave",
                                            "data":{"opt":"Leave"}
                
                                        }
                                    ]
                                }
                            })
                            session.send(msg)
                        } 
                    });
                
                
                }
                //For first time clicked on show more items
                else if(filterobj1.opt === "Show more items_1")
                {
                    console.log("The show more button is success")
                    // session.send("The show more button_1 is working");
                    // session.send("2nd time for show more items")
                          
                    pageNumber = filterobj1.x + 1;
                    console.log("The incremented page number for pageNumber is " + pageNumber)
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
                        // session.send("this is inside final 3 function with page number " + pageNumber)
                        // more items link
                        if (pageResult.totalCount > pageNumber * settings.pageSize) {
                            var moreCard = new builder.HeroCard(session)
                                .title(settings.showMoreTitle)
                                .buttons([
                                    builder.CardAction.postBack(session, session.gettext(settings.showMoreValue), settings.showMoreValue)
                                ]);
                            //session.send(new builder.Message(session).addAttachment(moreCard));
                             var msg = new builder.Message(session).addAttachment({
                            contentType: "application/vnd.microsoft.card.adaptive",
                            content: {
                                "type": "AdaptiveCard",
                                "version": "0.5",
                                "body": [
                                    {
                                        "type": "TextBlock",
                                        "text": "Specifications",
                                        "weight": "bolder"
                                    },
                                    {
                                        "type": "Input.ChoiceSet",
                                        "id": "myColor",
                                        "style": "compact",
                                        // "placeholder": "Choose Color",
                                        "value":"Choose Color",
                                        "isMultiSelect": false,
                                        "choices": [
                                            {   
                                                "title": "Choose Color",
                                                "value": "Choose Color"
                                            },
                                            {
                                                "title": "Gray",
                                                "value": "Gray"
                                            },
                                            {
                                                "title": "Black",
                                                "value": "Black"
                                            },
                                            {
                                                "title": "Brown",
                                                "value": "Brown"
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
                                        "title": "Return Policy?",
                                        "valueOn": "true",
                                        "valueOff": "false"

                                    }
                                ],

                                "actions": [
                                    {
                                        "type": "Action.Submit",
                                        "title": "Apply Filter",
                                        "data":{"opt":"Apply Filters"}
                                    },
                                    {
                                        "type": "Action.Submit",
                                        "title": "Show more results",
                                        "data":{"opt":"Show more items","x":pageNumber}
                                    },
                                    {
                                        "type": "Action.Submit",
                                        "title": "Shop Again",
                                        "data":{"opt":"Shop Again"}
                                    },
                                    {
                                        "type": "Action.Submit",
                                        "title": "Leave",
                                        "data":{"opt":"Leave"}
            
                                    }
                                ]
                            }
                        })
                        session.send(msg)
                        }


                        
                        else
                        {
                            session.send("You have reached end of the list")
                            var msg = new builder.Message(session).addAttachment({
                                contentType: "application/vnd.microsoft.card.adaptive",
                                content: {
                                    "type": "AdaptiveCard",
                                    "version": "0.5",
                                    "body": [
                                        {
                                            "type": "TextBlock",
                                            "text": "Specifications",
                                            "weight": "bolder"
                                        },
                                        {
                                            "type": "Input.ChoiceSet",
                                            "id": "myColor",
                                            "style": "compact",
                                            // "placeholder": "Choose Color",
                                            "value":"Choose Color",
                                            "isMultiSelect": false,
                                            "choices": [
                                                {   
                                                    "title": "Choose Color",
                                                    "value": "Choose Color"
                                                },
                                                {
                                                    "title": "Gray",
                                                    "value": "Gray"
                                                },
                                                {
                                                    "title": "Black",
                                                    "value": "Black"
                                                },
                                                {
                                                    "title": "Brown",
                                                    "value": "Brown"
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
                                            "title": "Return Policy?",
                                            "valueOn": "true",
                                            "valueOff": "false"
    
                                        }
                                    ],
    
                                    "actions": [
                                        {
                                            "type": "Action.Submit",
                                            "title": "Apply Filters",
                                            "data":{"opt":"Apply Filters"}
                                        },
                                        {
                                            "type": "Action.Submit",
                                            "title": "Shop Again",
                                            "data":{"opt":"Shop Again"}
                                        },
                                        {
                                            "type": "Action.Submit",
                                            "title": "Leave",
                                            "data":{"opt":"Leave"}
                
                                        }
                                    ]
                                }
                            })
                            session.send(msg)
                        } 
                    });
                }
                //Handling the button Shop Again in adaptive cards
                else if(filterobj1.opt === "Shop Again")
                {
                    console.log("The shop again button is successful")
                    // session.send("The shop again button is successful")
                    session.beginDialog('shop:/');
                }
                //Handling Leave button in adaptive cards
                else if(filterobj1.opt === "Leave")
                {
                    console.log("The leave button is successful")
                    // session.send("The leave button is successful")
                    session.endDialog('Good Bye! Have a nice day :)')
                }
                //Handling Apply filters button in adaptive cards
                else if(filterobj1.opt === "Apply Filters")
                {
                    //session.send("This apply filter is working successfully")
                    // session.send("The properties of your applied filter are Color: " + filterobj1.myColor + " sale is " + filterobj1.IsSale + " return policy is  " + filterobj1.IsReturnPolicy)
                    getQuery();//To build the query
                    setTimeout(final4,1500)
                }
                count += 1
                //This getSearchQurery is for triple extraction
                function getSearchQuery() {
                    //session.send("ITS BEGINNIG HEREEEEEEEeee"),
                    allProducts = []
                    url_te = "http://34.201.62.199:7777/nlpapi/tri?text=" + session.message.text;
                    search_qry = []
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
                            final2()
                        })

                }
                //The final2 is for searching the query in the solr
                function final2() {
                    //console.log("I AM HERE FINAL22")
                    // console.log(query)
                    client1.search
                        (getQuery(search_qry), function (err, obj) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                console.log("This after the filters are applied")
                                resultsobj = obj.response;
                                // console.log(resultsobj)
                                // console.log("The total number of results are " +resultsobj.numFound)
                                console.log("YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYy")
                                // console.log(resultsobj.docs[1])
                                // console.log(resultsobj.numFound)
                                // console.log(typeof (resultsobj.docs))
                                // console.log(resultsobj.docs)
                                for (var i = 0; i < resultsobj.numFound; i++) {
                                    allProducts.push({
                                        name: resultsobj.docs[i].title.toString(),
                                        imageUrl: resultsobj.docs[i]['url'],
                                        price: parseFloat((resultsobj.docs[i]['formattedPrice']).slice(1)),
                                    })
                                }
                                final3()
                            }
                        })
                }
                function final4() {
                    getSearchQuery()
                }
                //Adaptive cards
                function final3() {
                    session.dialogData.allProducts = allProducts
                    // retrieve from service and send items
                    // pageNumber = filterobj1.x +1;
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
                        // session.send("this is inside final 3 function with page number " + pageNumber)
                        // more items link
                        if (pageResult.totalCount > pageNumber * settings.pageSize) {
                            var moreCard = new builder.HeroCard(session)
                                .title(settings.showMoreTitle)
                                .buttons([
                                    builder.CardAction.postBack(session, session.gettext(settings.showMoreValue), settings.showMoreValue)
                                ]);
                            //session.send(new builder.Message(session).addAttachment(moreCard));
                             var msg = new builder.Message(session).addAttachment({
                            contentType: "application/vnd.microsoft.card.adaptive",
                            content: {
                                "type": "AdaptiveCard",
                                "version": "0.5",
                                "body": [
                                    {
                                        "type": "TextBlock",
                                        "text": "Specifications",
                                        "weight": "bolder"
                                    },
                                    {
                                        "type": "Input.ChoiceSet",
                                        "id": "myColor",
                                        "style": "compact",
                                        // "placeholder": "Choose Color", 
                                        "value":"Choose Color",
                                        "isMultiSelect": false,
                                        "choices": [
                                            {   
                                                "title": "Choose Color",
                                                "value": "Choose Color"
                                            },
                                            {
                                                "title": "Gray",
                                                "value": "Gray"
                                            },
                                            {
                                                "title": "Black",
                                                "value": "Black"
                                            },
                                            {
                                                "title": "Brown",
                                                "value": "Brown"
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
                                        "title": "Return Policy?",
                                        "valueOn": "true",
                                        "valueOff": "false"

                                    }
                                ],

                                "actions": [
                                    {
                                        "type": "Action.Submit",
                                        "title": "Apply Filter",
                                        "data":{"opt":"Apply Filters"}
                                    },
                                    {
                                        "type": "Action.Submit",
                                        "title": "Show more results",
                                        "data":{"opt":"Show more items","x":pageNumber}
                                    },
                                    {
                                        "type": "Action.Submit",
                                        "title": "Shop Again",
                                        "data":{"opt":"Shop Again"}
                                    },
                                    {
                                        "type": "Action.Submit",
                                        "title": "Leave",
                                        "data":{"opt":"Leave"}
            
                                    }
                                ]
                            }
                        })
                        session.send(msg)
                        }


                        
                        else
                        {
                            session.send("You have reached end of the list")
                            var msg = new builder.Message(session).addAttachment({
                                contentType: "application/vnd.microsoft.card.adaptive",
                                content: {
                                    "type": "AdaptiveCard",
                                    "version": "0.5",
                                    "body": [
                                        {
                                            "type": "TextBlock",
                                            "text": "Specifications",
                                            "weight": "bolder"
                                        },
                                        {
                                            "type": "Input.ChoiceSet",
                                            "id": "myColor",
                                            "style": "compact",
                                            // "placeholder": "Choose Color",
                                            "value":"Choose Color",
                                            "isMultiSelect": false,
                                            "choices": [
                                                {   
                                                    "title": "Choose Color",
                                                    "value": "Choose Color"
                                                },
                                                {
                                                    "title": "Gray",
                                                    "value": "Gray"
                                                },
                                                {
                                                    "title": "Black",
                                                    "value": "Black"
                                                },
                                                {
                                                    "title": "Brown",
                                                    "value": "Brown"
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
                                            "title": "Return Policy?",
                                            "valueOn": "true",
                                            "valueOff": "false"
    
                                        }
                                    ],
    
                                    "actions": [
                                        {
                                            "type": "Action.Submit",
                                            "title": "Apply Filters",
                                            "data":{"opt":"Apply Filters"}
                                        },
                                        {
                                            "type": "Action.Submit",
                                            "title": "Shop Again",
                                            "data":{"opt":"Shop Again"}
                                        },
                                        {
                                            "type": "Action.Submit",
                                            "title": "Leave",
                                            "data":{"opt":"Leave"}
                
                                        }
                                    ]
                                }
                            })
                            session.send(msg)
                        } 
                    });
                
                }
                //For building query with filters
                function getQuery(search_qry) {
                    //True conversion of array into string
                    // console.log(search_qry)
                    stringsearched = JSON.stringify(search_qry);
                    var filterobj = session.message.value;
                    // console.log("This is inside of getQuery")
                    // console.log(filterobj)
                    // console.log("End this is inside of getQuery")

                    //Applying filters and building query based on that
                    if (filterobj.myColor === "Choose Color")
                    // if (filterobj.myColor === ) 
                     {
                        filterobj.myColor = "*";
                    }

                    //For manipulating sale filter
                    if (filterobj.IsSale === "true") {
                        filterobj.IsSale = 'y'
                    }
                    else if (filterobj.IsSale === "false") {
                        filterobj.IsSale = '*'
                    }

                    //For manipulating returnpolicy filter
                    if (filterobj.IsReturnPolicy === "true") {
                        filterobj.IsReturnPolicy = 'y'
                    }
                    else if (filterobj.IsReturnPolicy === "false") {
                        filterobj.IsReturnPolicy = '*'
                    }

                    var query = client1.query().q({ description : search_qry }).matchFilter('color', filterobj.myColor).matchFilter('sale', filterobj.IsSale).matchFilter('isReturnPolicy', filterobj.IsReturnPolicy).start(0).rows(10000)

                    console.log("This is inside of getQuery")                    
                    console.log(query)
                    console.log("End this is inside of getQuery")
                    console.log("The getQuery got built successfully")
                    // session.send("The getQuery got built successfully")
                    return (query)
                }
                
            }
            //This is for the first time results
            // retrieve from service and send items
            if (! session.message.value){       
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
                //Firsssssstttt Timmeeeeeeee These are adaptive cards and working fine
                // session.send("First Time")
                var msg = new builder.Message(session)
                .addAttachment({
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    "type": "AdaptiveCard",
                    "version": "0.5",
                    "body": [
                        {
                            "type": "TextBlock",
                            "text": "Specifications",
                            "weight": "bolder"
                        },
                        {
                            "type": "Input.ChoiceSet",
                            "id": "myColor",
                            "style": "compact",
                            "value":"Choose Color",
                            // "placeholder": "Choose Color",
                            "isMultiSelect": false,
                            "choices": [
                                {   
                                    "title": "Choose Color",
                                    "value": "Choose Color"
                                },
                                {
                                    "title": "Gray",
                                    "value": "Gray"
                                },
                                {
                                    "title": "Black",
                                    "value": "Black"
                                },
                                {
                                    "title": "Brown",
                                    "value": "Brown"
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
                            "title": "Return Policy?",
                            "valueOn": "true",
                            "valueOff": "false"

                        }
                    ],

                    "actions": [
                        {
                            "type": "Action.Submit",
                            "title": "Apply Filters",
                            "data":{"opt":"Apply Filters"}
                        },
                        {
                            "type": "Action.Submit",
                            "title": "Show more results",
                            "data":{"opt":"Show more items_1","x":pageNumber}
                        },
                        {
                            "type": "Action.Submit",
                            "title": "Shop Again",
                            "data":{"opt":"Shop Again"}
                        },
                        {
                            "type": "Action.Submit",
                            "title": "Leave",
                            "data":{"opt":"Leave"}

                        }
                    ]
                }
                })
                    session.send(msg)
            });
            
        }
        };
    }
};

function isSelection(input, selectPrefix) {
    return input.toLowerCase().indexOf(selectPrefix.toLowerCase()) === 0;
}