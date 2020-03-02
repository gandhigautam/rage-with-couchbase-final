require('dotenv').config()
const { cbUser, cbPass } = process.env

const express = require('express')
const cors = require('cors')
const graphqlHTTP = require('express-graphql')
const { buildSchema } = require('graphql')
  
const couchbase = require('couchbase')
  
const app = express()
app.use(cors())

const cluster = new couchbase.Cluster('couchbase://localhost', { username: cbUser, password: cbPass })
const bucket = cluster.bucket('travel-sample')
var collection = bucket.defaultCollection();

const schema = buildSchema(`
  type Query {
    airlinesUK: [Airline],
    airlineByKey(id: Int!): Airline
  }
  type Airline {
    id: Int,
    callsign: String,
    country: String,
    iata: String,
    icao: String,
    name: String
  }
`)

const root = {
  airlinesUK: () => {
    let statement =
      "SELECT META(airline).id, airline.* " +
      "FROM `travel-sample` AS airline " +
      "WHERE airline.type = 'airline' " +
      "AND airline.country = 'United Kingdom' "
    return new Promise((resolve, reject) => {
      cluster.query(
        statement, (error, result) => error 
          ? reject(error) 
          : resolve(result.rows)
      )
    }).catch(e => console.error(e))
  },
  airlineByKey: (data) => {
    let dbkey = "airline_" + data.id
    return new Promise((resolve, reject) => {
      collection.get(
        dbkey, (error, result) => error 
          ? reject(error) 
          : resolve(result.value)
      )
    }).catch(e => console.error(e))
  }
}

const serverPort = 4000
const serverUrl = '/graphql'
app.use(serverUrl, graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true
}))

app.listen(serverPort, () => {
  let message = `GraphQL server now running on http://localhost:${serverPort}${serverUrl}`
  console.log(message)
})