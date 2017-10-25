
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

var lib = new builder.Library('product-selection');

// These steps are defined as a waterfall dialog,
// but the control is done manually by calling the next func argument.
lib.dialog('/',
    new SimpleWaterfallDialog([
        // First message
        
        function (session, args, next) {
                
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
                    search_qry.sort(function(a,b)
                    {
                        return b.length - a.length; //DSC, For Ascending order use: b - a
                    }
                )
                }
                console.log(search_qry);
                session.dialogData.search_qry=search_qry
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
                            name:resultsobj.docs[i]['title'].toString(),
                            // name:"Retail Bot Product " + i,
                            imageUrl:resultsobj.docs[i]['url'],
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
            next()
        }
        function getQuery(search_qry) {
            //Creating connection to Solr
            var qb = new SolrQueryBuilder();
            
            // var opt = {title:['guestbook','heater']};
        
            //True coonversion of array into string
            stringsearched = JSON.stringify(search_qry);
            //stringsearched=[]
            // console.log(typeof(stringsearched))
            // console.log("The string searched is " + stringsearched)
        
            //Defines the properties and gives the values to be searched in those properties
            var opt = { title: [stringsearched] };
        
            //Creates the query with multiple search terms retrieved from stringssearched
            if (opt.title) qb.where('title').in(opt.title);

            //Connects to the Solr server and passes the query.            
            var query = client1.createQuery().q(qb.build()).start(0).rows(1000000);
            // var query = client1.query().q({ title: search_qry }).start(0).rows(10000)
            
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
