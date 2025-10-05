import{v4 as uuid4} from "uuid";
import {PutCommand} from "@aws-sdk/lib-dynamodb";
import {dynamoDb} from "../../services/db.mjs";
import dotenv from "dotenv";
import {logger} from "../../middleware/logger.mjs"
import {errorHandler} from "../../middleware/errorHandler.mjs"
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import { authMiddleware } from "../../middleware/authMiddleware.mjs";

dotenv.config();

const createQuizFn=async(event)=>{
    console.log("event.user:", event.user);

    const {latitude,longitude}=event.body;
    const {userId, username}=event.user;

    //validate coordinates
    if(latitude===undefined||longitude===undefined){
        return {statusCode:400, body:JSON.stringify({error:"Latitude and longitude are required"})};
    }

    const latNum=Number(latitude);
    const lngNum=Number(longitude);

    if (isNaN(latNum)|| isNaN(lngNum)){
        return{statusCode:400, body:JSON.stringify({error:"Latitude and longitude must be numbers"})};
    }

    //round to 2 decimals, around 1.1km precision
    const latRounded=Math.round(latNum*100)/100;
    const lngRounded=Math.round(lngNum*100)/100;


    const quizId=uuid4();
    const createdAt=new Date().toISOString();

    //quiz metadata
    const quizItem={
        PK:`QUIZ#${quizId}`,
        SK:"META",
        ItemType:"Quiz",
        quizId,
        title:username,
        creatorId:userId,
        latitude:latRounded,
        longitude:lngRounded,
        createdAt,
    };

    await dynamoDb.send(new PutCommand({TableName:process.env.QUIZGAME_TABLE, Item:quizItem}));

    return {
        statusCode:201, 
        body:JSON.stringify({
            message:"Quiz created successfully", 
            quizId,
            title:username,
            latitude:latRounded,
            longitude:lngRounded,
        })};
   

};

export const handler=middy(createQuizFn)
    .use(jsonBodyParser())
    .use(authMiddleware())
    .use(logger())
    .use(errorHandler());