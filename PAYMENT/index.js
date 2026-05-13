require('dotenv').config()
const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))

app.set('view engine', 'ejs')

app.get('/', (req, res) => {
    res.render('index.ejs')
})

app.post('/checkout', async (req, res) => {
    const plan = req.body.plan

    let price, productName

    if (plan === 'monthly') {
        productName = 'AI Monthly Plan'
        price = 49 * 100
    } else if (plan === 'yearly') {
        productName = 'AI Yearly Plan'
        price = 499 * 100
    } else {
        return res.redirect('/')
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: { name: productName },
                    unit_amount: price
                },
                quantity: 1
            }
        ],
        mode: 'payment',
        success_url: `${process.env.BASE_URL}/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/cancel`
    })

    res.redirect(session.url)
})

app.get('/complete', async (req, res) => {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id)
    res.send(`Payment successful for ${session.amount_total / 100} USD!`)
})

app.get('/cancel', (req, res) => {
    res.send('Payment cancelled. Please try again.')
})

app.listen(3006, () => console.log('Server started on port 3000'))
