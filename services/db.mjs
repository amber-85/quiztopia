import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb";

//create raw DynamoDB client
const client=new DynamoDBClient({region:process.env.AWS_REGION||"eu-north-1"});

//wrap it with DocumentClient for easier operations with JS objects
export const dynamoDb=DynamoDBDocumentClient.from(client);
