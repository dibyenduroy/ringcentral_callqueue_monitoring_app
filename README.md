## Call Queue Monitoring App

#This is a demo app to explore Monitoring of Call Queues using subscribtion to RingCentral Event Filter for Telephony Sessions

#The Endpoint that is subscribed to is '/restapi/v1.0/account/~/telephony/sessions'. For the Demo App, I am using basic #password flow and App Type is Private. Please Create your App in RingCentral Accordingly. Also please remember to update
#your .env file with your App specific credentials.

 App Flow and Architechture


For this App I am using RingCantral PUBNUB Subscription , you can also use Webhook. 

 Step 1 : The App Subscribes to '/restapi/v1.0/account/~/telephony/sessions' using PUBNUB
 Step 2 : The Emitted JSON Data out of the Subscription is pushed to a MySql Database
 Step 3 : A seperate Node App is used to manipulate the captured and display results accordingly

## Installation steps

 Clone the Repo : git clone https://github.com/dibyenduroy/ringcentral_callqueue_monitoring_app.git

 npm install

 Run the 2 Apps Seperately in 2 Tabs node index.js (Runs on 5000 port) node index_viewer.js (Runs on 8000 port)

 Once both the Apps are up and Running open http://localhost:8080/ and make some calls on your RC Number and test cases like 
 calls on Hols etc.

