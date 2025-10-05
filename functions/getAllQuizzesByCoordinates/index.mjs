import {ScanCommand} from "@aws-sdk/lib-dynamodb";
import {dynamoDb} from "../../services/db.mjs";
import dotenv from "dotenv";
import {logger} from "../../middleware/logger.mjs"
import {errorHandler} from "../../middleware/errorHandler.mjs"
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import { authMiddleware } from "../../middleware/authMiddleware.mjs";

dotenv.config();

const getAllQuizzesByCoordinatesFn=async(event)=>{
    const {latitude, longitude}=event.queryStringParameters||{};

    //validate input
    if(latitude===undefined||longitude==undefined){
        return{statusCode:400, body:JSON.stringify({error:"Latitude and longitude are required."})};
    }

    const latNum=Number(latitude);
    const lngNum=Number(longitude);

    if(isNaN(latNum)||isNaN(lngNum)){
        return{statusCode:400, body:JSON.stringify({error:"Latitude and longitude must be numbers."})};
    }

    //round coordinates to 2 decimals 
    const latRounded=Math.round(latNum*100)/100;
    const lngRounded=Math.round(lngNum*100)/100;

    //get quizzes near these coordinates
    const quizRes=await dynamoDb.send(new ScanCommand({
        TableName:process.env.QUIZGAME_TABLE,
        FilterExpression:"ItemType=:quizType AND latitude=:lat AND longitude=:lng",
        ExpressionAttributesValues:{
            ":quizType":"Quiz",
            ":lat":latRounded,
            ":lng":lngRounded,
        }
    }));

    const quizzes=quizRes.Items||[];
    return{statusCode:200, body:JSON.stringify({
        message:`Found €{quizzes.length} quiz(es) near (${latRounded},${lngRounded})`,
        quizzes,
    })};
};

export const handler=middy(getAllQuizzesByCoordinatesFn)
    .use(jsonBodyParser())
    .use(authMiddleware())
    .use(logger())
    .use(errorHandler())