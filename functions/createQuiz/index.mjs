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

export const createQuizFn=async(event)=>{
    const {title}=event.body;
    const creatorId=event.user.userId;

    //validate inputs
    if(!title){
        return {statusCode:400, body:JSON.stringify({error:"Quiz title is required"})};
    }
    const quizId=uuid4();
    const createdAt=new Date().toISOString();

    //quiz metadata
    const quizItem={
        PK:`QUIZ#${quizId}`,
        SK:"META",
        ItemType:"Quiz",
        quizId,
        title,
        creatorId,
        createdAt
    };

    await dynamoDb.send(new PutCommand({TableName:process.env.QUIZGAME_TABLE, Item:quizItem}));

    return {
        statusCode:201, 
        body:JSON.stringify({
            message:"Quiz created successfully", 
            quizId,
            title})};
};

export const handler=middy(createQuizFn)
    .use(jsonBodyParser())
    .use(authMiddleware())
    .use(logger())
    .use(errorHandler());