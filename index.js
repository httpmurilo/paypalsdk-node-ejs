const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const paypal = require("paypal-rest-sdk");

app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


paypal.configure({
    'mode': 'sandbox', 
    'client_id': 'seuid',
    'client_secret': 'seusecret'
});



app.get("/",(req, res) => {

    res.render("index");

});

app.post("/comprar",(req, res) => {

    var email = req.body.email;
    var id = req.body.id;

    var {name, price, amount} = req.body;

    var total = price * amount;

    console.log(total);

    var pagamento = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": `http://localhost:45567/final?email=${email}&id=${id}&total=${total}`,
            "cancel_url": "http://cancel.url"
        },
        "transactions": [{
            "item_list": {
                "items": [
                    {
                        "name": name,
                        "sku": name,
                        "price": price,
                        "currency": "BRL",
                        "quantity": amount
                    }
                ]
            },
            "amount": {
                "currency": "BRL",
                "total": total
            },
            "description": "Essa é a melhor bola de todas!"
        }]
    };


    paypal.payment.create(pagamento,(error, payment) => {

        if(error){
            console.log(error);
        }else{


            for(var i = 0; i < payment.links.length; i++){
                var p = payment.links[i];
                if(p.rel === 'approval_url'){
                    res.redirect(p.href);
                }
            }
        }

    });

});

app.get("/final",(req, res) => {

    var payerId = req.query.PayerID;
    var paymentId = req.query.paymentId;

    var emailDoCliente = req.query.email;
    var idDoCliente = req.query.id;
    var total = req.query.total;


    var final = {
        "payer_id": payerId,
        "transactions": [{
            "amount":{
                "currency": "BRL",
                "total": total
            }
        }]
    }

    paypal.payment.execute(paymentId,final,(error, payment) => {
        if(error){
            console.log(error);
        }else{

            res.json(payment);
        }
    })
})


app.get("/create", (req, res) => {

    var plan = {
        "name": "Plano Prata",
        "description": "Um plano bem barato e muito bom!",
        "merchant_preferences": {
            "auto_bill_amount": "yes",
            "cancel_url": "http://www.cancel.com",
            "initial_fail_amount_action": "continue",
            "max_fail_attempts": "1",
            "return_url": "http://www.success.com",
            "setup_fee": {
                "currency": "BRL",
                "value": "0"
            }
        },
        "payment_definitions": [
            {
                "amount": {
                    "currency": "BRL",
                    "value": "0"
                },
                "cycles": "7",
                "frequency": "DAY",
                "frequency_interval": "1",
                "name": "Teste gratis",
                "type": "TRIAL"
            },
            {
                "amount": {
                    "currency": "BRL",
                    "value": "24"
                },
                "cycles": "0",
                "frequency": "MONTH",
                "frequency_interval": "1",
                "name": "Regular Prata",
                "type": "REGULAR"
            }
        ],
        "type": "INFINITE"
    }


    paypal.billingPlan.create(plan,(err, plan) => {

        if(err){
            console.log(err)
        }else{
            console.log(plan);
            res.json(plan);
        }
    });
});


app.get("/list",(req, res) => {
    paypal.billingPlan.list({'status': 'ACTIVE'},(error, plans) => {
        if(error){
            console.log(error);
        }else{
            res.json(plans);
        }
    })
});

app.get("/active/:id", (req, res) => {


    var mudancas = [

        {
            "op":"replace",
            "path":"/",
            "value":{
                "state": "ACTIVE"
            }
        }

    ]

    paypal.billingPlan.update(req.params.id,mudancas,(err, result)  => {
        if(err){
            console.log(err);
        }
        res.send("mudanca feita!");
    });

})


app.post("/sub",(req, res) => {
    var email = req.body.email;
    var idDoPlano = "P-05V74422GL0778002XC6EP4A";


    var isoDate = new Date(Date.now());
    isoDate.setSeconds(isoDate.getSeconds() + 4);
    isoDate.toISOString().slice(0, 19) + 'Z';


    var dadosDaAssinatura = {
        "name": "Assinatura do plano prata",
        "description": "Plano prata 25 R$/mês",
        "start_date": isoDate,
        "payer": {
          "payment_method": "paypal"
        },
        "plan": {
          "id": idDoPlano
        },
        "override_merchant_preferences": {
          "return_url": `http://localhost:45567/subreturn?email=${email}`,
          "cancel_url": "https://example.com/cancel"
        }
      }


      paypal.billingAgreement.create(dadosDaAssinatura,(error, assinatura) => {
        if(error){
            console.log(error);
        }else{
            res.json(assinatura);
        }
      });
})

app.get("/subreturn",(req, res) => {
    var email = req.query.email;
    var token = req.query.token;

    paypal.billingAgreement.execute(token,{},(error, assinatura) => {

        if(error){
            console.log(error);
        }else{

            res.json(assinatura);
        }

    });
});

app.get("/info/:id", (req, res) => {
    var id = req.params.id;

    paypal.billingAgreement.get(id,(error, assinatura) => {
        if(error){
            console.log(error);
        }else{
            res.json(assinatura);
        }
    });

})

app.get("/cancel/:id", (req, res) => {
    var id = req.params.id;

    paypal.billingAgreement.cancel(id, {"note":"O cliente pediu para cancelar!"},(error, response) => {
        if(error){
            console.log(error);
        }else{
            res.send("assinatura cancelada!");
        }
    });
})

app.listen(45567, () => {
    console.log("Running!")
})

