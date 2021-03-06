
var _ = require('lodash');
var builder = require('botbuilder');
var products = require('../../services/products');
//var products = require('../../services/AllProducts');
var SimpleWaterfallDialog = require('./SimpleWaterfallDialog');
var CarouselPagination = require('./CarouselPagination');

var carouselOptions = {
    showMoreTitle: 'title_show_more',
    showMoreValue: 'show_more',
    selectTemplate: 'Selected product added to the cart!! ',
    pageSize: 5,
    unknownOption: 'unknown_option'
};

var Client = require('node-rest-client').Client;
var solr = require('solr-client');
var SolrQueryBuilder = require('solr-query-builder');
var SolrNode = require('solr-node');

var client = new Client();

var client1 = solr.createClient('54.158.112.215', '8080', 'ecommerce_2');
// var client1 = solr.createClient('localhost', '8983', 'ecommerce_2');


var lib = new builder.Library('product-selection');


// These steps are defined as a waterfall dialog,
// but the control is done manually by calling the next func argument.
lib.dialog('/',
    new SimpleWaterfallDialog([
        // First message
        
        function (session, args, next) {
        
        
        function getSearchQuery(){
            allProducts=[]
            url_pos = "http://54.158.112.215:8000/pos?line=" + session.message.text;
            search_qry=[]
            var args =
            {
                data: { test: "hello" },
                headers: { "Content-Type": "application/json" }
            };
            var client = new Client();
            client.post
            (url_pos, args, function (data, response) {
                //Handles when triple extarction yields null results
                    reslen = Object.keys(data).length;
                    search_JJ = []
                    search_NNS = []
                    search_NN=[]
                    search_NNP=[]
                    search_NNPS=[]
                    B = [undefined]


                    for (var i = 0; i < reslen; i ++)
                      {
                            if(data[i]['JJ'] != null)
                            {
                                search_JJ.push(data[i]['JJ'])
                            }
                            if (data[i]['NNS'] != undefined)
                            {
                                search_NNS.push(data[i]['NNS'])
                                // console.log(search_NNS)                
                            }
                            if(data[i]['NNPS'] != undefined)
                            {
                                search_NNPS.push(data[i]['NNPS'])
                                // console.log(search_NNPS)
                            }
                            if (data[i]['NN'] != undefined)
                            {
                                search_NN.push(data[i]['NN'])
                                // console.log(search_NN)                
                            }
                            if (data[i]['NNP'] != undefined)
                            {
                                search_NNP.push(data[i]['NNP'])
                                // console.log(search_NNP)              
                            }
                    }

                    var search_N1 = search_NNS.concat(search_NN,search_NNP,search_NNPS)


                    diff = search_JJ.filter(x => B.indexOf(x) < 0 );
                    diff_NNS = search_N1.filter(x => B.indexOf(x) < 0); 

                    if(diff.length > 0)
                    {
                        for (var i=0;i<diff.length;i++)
                        {
                           for (var j=0;j<diff_NNS.length;j++)
                           {
                            new_word = diff[i] + " " + diff_NNS[j]
                            search_qry.push(new_word)
                           } 
                        }
                    }
                    else
                    {
                        search_qry = search_N1
                    }

                    search_qry.sort(function(a,b)
                    {
                        return b.length - a.length; //DSC, For Ascending order use: b - a
                    })
                console.log("$$$$$$$$$$$$$")
                console.log(search_qry);
                console.log("$$$$$$$$$$$$$")                
                session.dialogData.search_qry=search_qry
                querynrender()   
            })
            
        }
        function getPOS(message)
        {
            search_JJ=[] //Array of adjectives  
            search_NNS=[] //Array of Nouns
            // search_qry=[] //Search terms
            B = [undefined]    
            search_new = []
            url_pos = "http://54.158.112.215:8000/pos?line=" + message;
            var args =
            {
                data: { test: "hello" },
                headers: { "Content-Type": "application/json" }
            };
        
            client.post(url_pos,args,function(data, response)
            {
                reslen = Object.keys(data).length; 
                // console.log("The length of the object is in POSTAG is  " + reslen)  
                
                for (var i = 0; i < reslen; i ++)
                {
                    search_JJ.push(data[i]['JJ'])
                    search_NNS.push(data[i]['NNS'])
                }
                
                diff = search_JJ.filter(x => B.indexOf(x) < 0 );
                diff_NNS = search_NNS.filter(x => B.indexOf(x) < 0);  
        
                for (var i=0;i<diff.length;i++)
                {
                   for (var j=0;j<diff_NNS.length;j++)
                   {
                    new_word = diff[i] + " " + diff_NNS[j]
                    search_qry.push(new_word)
                   } 
                }
                console.log(search_qry) ;  
                querynrender()
                return "POS Success"      
            })
        }
        function resrender(){
            //console.log("I AM HERE resrender2")
            //console.log(query)
            client1.search
            (getQuery(search_qry), function (err, obj) {
                if (err) {
                    console.log(err);
                }
                else {
                    resultsobj = obj.response;
                    console.log(resultsobj.numFound)
                    for(var i =0; i < resultsobj.numFound; i++){
                        allProducts.push({
                            name:resultsobj.docs[i]['title'].toString(),
                            // name:"Retail Bot Product " + i,
                            imageUrl:resultsobj.docs[i]['url'],
                            price:parseFloat((resultsobj.docs[i]['formattedPrice']).slice(1)),
                        })
                    }
                    nextpage()
                }
            })
        }
        function querynrender(){
            query = getQuery(search_qry)
            resrender()
        }
        function nextpage(){
            session.dialogData.allProducts=allProducts
            next()
        }
        function getQuery(search_qry) {
            //Creating connection to Solr
            var qb = new SolrQueryBuilder();
            
            // var opt = {title:['guestbook','heater']};
        
            //True coonversion of array into string
            // stringsearched = JSON.stringify(search_qry);
            stringsearched = search_qry.toString()
            
        
            //Defines the properties and gives the values to be searched in those properties
            var opt = { title: [stringsearched] };
        
            //Creates the query with multiple search terms retrieved from stringssearched
            if (opt.title) qb.where('title').in(opt.title);

            //Connects to the Solr server and passes the query.            
            // var query = client1.createQuery().q(qb.build()).start(0).rows(1000000);
            var query = client1.query().q({ title: stringsearched }).start(0).rows(10000)           
            console.log(JSON.stringify(query))
            return (query)
        }
        getSearchQuery()
        },
        
        function (session, args, next) {
            session.send('choose_bouquet_from_category',"Retail Bot Product's");
            session.message.text = null;            // remove message so next step does not take it as input   
            next()
        },

        // Show Products
        function (session, args, next) {
            
            CarouselPagination.create(
                function (pageNumber, pageSize) { return products.getProducts(pageNumber, pageSize, session.dialogData.allProducts); },
                function (productName){return products.getProduct(productName,session.dialogData.allProducts)},
                productMapping,
                carouselOptions
            )(session, args, next);
        },
        
        // Product selected
        function (session, args, next) {
            // this is last step, calling next with args will end in session.endDialogWithResult(args)
            next({ selection: args.selected });
        }
    ]));

function productMapping(product) {
    return {
        title: product.name,
        subtitle:'$'+ product.price.toFixed(2),
        imageUrl: product.imageUrl,
        buttonLabel: 'choose_this'
    };
}
// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};